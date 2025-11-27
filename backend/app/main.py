from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from uuid import uuid4

import cv2
import mediapipe as mp
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Movement Analysis Backend",
    description="Backend für den Video-Upload und die Analyse-Pipeline",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not BASE_DIR.joinpath(".cors.json").exists() else ["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def analyze_video(video_path: Path) -> Tuple[str, List[List[dict]]]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError("Video konnte nicht geöffnet werden")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    annotated_path = video_path.with_name(f"{video_path.stem}_annotated{video_path.suffix}")
    rotated_width, rotated_height = height, width
    writer = cv2.VideoWriter(
        str(annotated_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (rotated_width, rotated_height),
    )

    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    keypoints_samples: List[List[dict]] = []
    frame_index = 0
    sample_interval = max(int(fps), 1)

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while True:
            success, frame = cap.read()
            if not success:
                break

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(frame_rgb)

            if result.pose_landmarks:
                mp_drawing.draw_landmarks(
                    frame,
                    result.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                    mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2),
                )

                if frame_index % sample_interval == 0 and len(keypoints_samples) < 3:
                    keypoints_samples.append(
                        [
                            {
                                "name": mp_pose.PoseLandmark(idx).name,
                                "x": float(landmark.x),
                                "y": float(landmark.y),
                                "visibility": float(landmark.visibility),
                            }
                            for idx, landmark in enumerate(result.pose_landmarks.landmark)
                        ]
                    )

            rotated_frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            writer.write(rotated_frame)
            frame_index += 1

    cap.release()
    writer.release()

    return annotated_path.name, keypoints_samples


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    generated_name = f"{timestamp}_{uuid4().hex}_{file.filename}"
    target_path = UPLOAD_DIR / generated_name

    with target_path.open("wb") as buffer:
        content = await file.read()
        buffer.write(content)

    try:
        annotated_name, keypoints = analyze_video(target_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Analyse des Videos fehlgeschlagen") from exc

    return JSONResponse(
        {
            "message": "Video erfolgreich analysiert",
            "filename": generated_name,
            "annotated": annotated_name,
            "keypoints": keypoints,
        }
    )
