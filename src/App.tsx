import React, { useMemo, useState } from 'react';

type KeypointRecord = {
  name: string;
  x: number;
  y: number;
  visibility: number;
};

type AnalysisResult = {
  filename: string;
  message: string;
  annotated?: string;
};

const mockEvaluations = [
  { label: 'Form precision', value: 92, trend: '+4%' },
  { label: 'Explosive power', value: 87, trend: '+1%' },
  { label: 'Joint stability', value: 78, trend: '-2%' },
  { label: 'Control & timing', value: 85, trend: '+3%' }
];

const mockRecs = [
  'Höhere Rumpfspannung während der Aufwärtsbewegung',
  'Schultern entspannt halten, um unnötige Rotation zu vermeiden',
  'Leichtes Vorverlagern des Körperschwerpunkts vor dem Absprung'
];

const AnalysisSummary = () => (
  <div className="card summary-card">
    <h3>KI-Auswertung</h3>
    <p className="description">
      Das Machine-Learning-Modell bewertet jede Bewegung auf Präzision, Kraft und
      Stabilität. Die Visualisierung unten zeigt Trends über die letzten Durchläufe.
    </p>
    <div className="summary-grid">
      {mockEvaluations.map((item) => (
        <div key={item.label}>
          <p className="label">{item.label}</p>
          <div className="value-row">
            <p className="value">{item.value}%</p>
            <p className="trend">{item.trend}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Recommendations = () => (
  <div className="card">
    <h3>Persönliche Empfehlungen</h3>
    <ul>
      {mockRecs.map((rec) => (
        <li key={rec}>{rec}</li>
      ))}
    </ul>
  </div>
);

function App() {
  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<'idle' | 'pending' | 'done'>('idle');
  const [feedback, setFeedback] = useState<string>('Warte auf Upload...');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(null);
  const [keypointSamples, setKeypointSamples] = useState<KeypointRecord[][]>([]);

  const canAnalyze = Boolean(videoFile) && analysisState !== 'pending';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setVideoFile(file);
    setAnalysisState('idle');
    setFeedback('Video bereit für die Analyse.');
    setAnalysisResult(null);
    setError(null);
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
    }
    setAnnotatedVideoUrl(null);
    setKeypointSamples([]);
  };

  const triggerAnalysis = async () => {
    if (!videoFile) return;
    setAnalysisState('pending');
    setFeedback('Video wird ans Backend geschickt...');
    setError(null);
    setAnalysisResult(null);
    setAnnotatedVideoUrl(null);
    setKeypointSamples([]);

    const formData = new FormData();
    formData.append('file', videoFile);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message ?? 'Upload fehlgeschlagen');
      }

      const normalizedBase = API_BASE.replace(/\/$/, '');
      const annotatedName = json.annotated ? `${normalizedBase}/uploads/${json.annotated}` : null;
      setAnalysisResult({
        filename: json.filename ?? 'unbekannt',
        message: json.message ?? 'Upload erfolgreich',
        annotated: json.annotated ?? undefined
      });
      setAnnotatedVideoUrl(annotatedName);
      setKeypointSamples(json.keypoints ?? []);
      setFeedback(
        `Backend: ${json.message ?? 'Datei gespeichert'}` +
          (annotatedName ? ' — Annotiertes Video verfügbar' : '')
      );
      setAnalysisState('done');
    } catch (caught) {
      const errorMsg = caught instanceof Error ? caught.message : 'Unbekannter Fehler';
      setError(errorMsg);
      setFeedback('Upload fehlgeschlagen. Bitte erneut versuchen.');
      setAnalysisState('idle');
    }
  };

  const progressSteps = ['Upload', 'Analyse', 'Insights'];
  const currentStep = useMemo(() => {
    if (analysisState === 'pending') return 1;
    if (analysisState === 'done') return 2;
    return 0;
  }, [analysisState]);
  const firstSample = keypointSamples[0] ?? [];

  return (
    <div className="app-shell">
      <header>
        <p className="eyebrow">Movement Lab</p>
        <h1>AI-gestützte Bewegungsanalyse</h1>
        <p>Filme dich mit deinem iPhone, lade die Aufnahme hoch, und erhalte sofortiges Feedback.</p>
      </header>

      <section className="card upload-card">
        <div className="upload-status">
          <p className="status-label">Aktueller Status</p>
          <div className="status-pill">{analysisState === 'pending' ? 'Analyse läuft' : 'Bereit'}</div>
        </div>

        <label className="file-input">
          <input type="file" accept="video/*" onChange={handleFileChange} />
          <span>{videoFile ? videoFile.name : 'Video oder Live-Aufnahme hinzufügen'}</span>
        </label>

        <div className="actions">
          <button type="button" className="primary" disabled={!canAnalyze} onClick={triggerAnalysis}>
            Analyse starten
          </button>
          <button type="button" className="ghost" disabled={!videoFile} onClick={() => setVideoUrl(null)}>
            Vorschau zurücksetzen
          </button>
        </div>

        <div className="progress">
          {progressSteps.map((label, index) => (
            <div key={label} className={`step ${index <= currentStep ? 'active' : ''}`}>
              <span>{index + 1}</span>
              <p>{label}</p>
            </div>
          ))}
        </div>

        {videoUrl && (
          <div className="preview">
            <video src={videoUrl} controls playsInline loop />
            <p>{feedback}</p>
            {error && (
              <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                <strong>Fehler:</strong> {error}
              </div>
            )}
            {analysisResult && (
              <div className="analysis-result">
                <h4>Analyse-Ergebnis</h4>
                <p><strong>Status:</strong> {analysisResult.message}</p>
              </div>
            )}
          </div>
        )}

        {annotatedVideoUrl && (
          <div className="annotated-card">
            <div className="annotated-header">
              <h4>Annotiertes Video</h4>
              <p>Jede Pose wurde von Mediapipes Google-Modell markiert.</p>
            </div>
            <video src={annotatedVideoUrl} controls playsInline loop />
            {firstSample.length > 0 && (
              <div className="keypoint-grid">
                {firstSample.slice(0, 6).map((point) => (
                  <div key={point.name} className="keypoint">
                    <p className="keypoint-name">{point.name.replace(/_/g, ' ')}</p>
                    <p className="keypoint-meta">Sichtbarkeit: {(point.visibility * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid">
        <AnalysisSummary />
        <Recommendations />
      </section>

      <footer>
        <p>
          Die nächsten Schritte: Upload per Airdrop oder Files-App, dann kann dein iPhone die neue React-App über Vite
          testen.
        </p>
      </footer>
    </div>
  );
}

export default App;
