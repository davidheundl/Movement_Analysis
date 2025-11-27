import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

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
  'Higher core engagement during the upward movement',
  'Keep shoulders relaxed to avoid unnecessary rotation',
  'Slight forward shift of body weight before the jump'
];

const AnalysisSummary = () => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Feedback</Text>
    <Text style={styles.description}>
      A versatile, trained machine learning model evaluates the uploaded video and assesses your posture, movement sequences, and body dynamics.
    </Text>
    <View style={styles.summaryGrid}>
      {mockEvaluations.map((item) => (
        <View key={item.label} style={styles.summaryItem}>
          <Text style={styles.label}>{item.label}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{item.value}%</Text>
            <Text style={styles.trend}>{item.trend}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

const Recommendations = () => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Improvement Suggestions</Text>
    {mockRecs.map((rec, index) => (
      <Text key={index} style={styles.recItem}>• {rec}</Text>
    ))}
  </View>
);

export default function App() {
  const API_BASE = 'http://192.168.178.35:8000'; // Für Expo Go auf physischem Gerät: IP-Adresse verwenden
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<'idle' | 'pending' | 'done'>('idle');
  const [feedback, setFeedback] = useState<string>('Waiting for upload...');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(null);
  const [keypointSamples, setKeypointSamples] = useState<KeypointRecord[][]>([]);

  const canAnalyze = Boolean(videoUri) && analysisState !== 'pending';

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setFileName(result.assets[0].fileName || 'video.mp4');
        setAnalysisState('idle');
        setFeedback('Ready for analysis');
        setAnalysisResult(null);
        setError(null);
        setAnnotatedVideoUrl(null);
        setKeypointSamples([]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load video');
    }
  };

  const triggerAnalysis = async () => {
    if (!videoUri) return;
    setAnalysisState('pending');
    setFeedback('Video is beeing evaluated by machine learnig modell');
    setError(null);
    setAnalysisResult(null);
    setAnnotatedVideoUrl(null);
    setKeypointSamples([]);

    try {
      const formData = new FormData();
      
      // Für React Native müssen wir das Video als Blob/File hinzufügen
      const fileInfo: any = {
        uri: videoUri,
        type: 'video/mp4',
        name: fileName || 'video.mp4',
      };
      
      formData.append('file', fileInfo as any);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message ?? 'Upload failed');
      }

      const normalizedBase = API_BASE.replace(/\/$/, '');
      const annotatedName = json.annotated ? `${normalizedBase}/uploads/${json.annotated}` : null;
      setAnalysisResult({
        filename: json.filename ?? 'unknown',
        message: json.message ?? 'Upload complete',
        annotated: json.annotated ?? undefined
      });
      setAnnotatedVideoUrl(annotatedName);
      setKeypointSamples(json.keypoints ?? []);
      setFeedback(
        `Backend: ${json.message ?? 'File saved successfully'}` +
          (annotatedName ? ' — Annotated video available' : '')
      );
      setAnalysisState('done');
    } catch (caught) {
      const errorMsg = caught instanceof Error ? caught.message : 'Unknown error';
      setError(errorMsg);
      setFeedback('Upload failed. Please try again.');
      setAnalysisState('idle');
      Alert.alert('Error', errorMsg);
    }
  };

  const progressSteps = ['Upload'];
  const currentStep = useMemo(() => {
    if (analysisState === 'pending') return 1;
    if (analysisState === 'done') return 2;
    return 0;
  }, [analysisState])
  const firstSample = keypointSamples[0] ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Movement Lab</Text>
          <Text style={styles.title}>Machine Learning Movement Analysis</Text>
          <Text style={styles.subtitle}>
            Record yourself with your iPhone, upload the recording, and get instant feedback.
          </Text>
        </View>

        <View style={styles.uploadCard}>
          <View style={styles.uploadStatus}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {analysisState === 'pending' ? 'Analysis in progress' : 'Ready'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.fileInput} onPress={pickVideo}>
            <Text style={styles.fileInputText}>
              {fileName ? fileName : 'Upload Video'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, !canAnalyze && styles.buttonDisabled]}
              disabled={!canAnalyze}
              onPress={triggerAnalysis}
            >
              {analysisState === 'pending' ? (
                <ActivityIndicator color="#050506" />
              ) : (
                <Text style={styles.primaryButtonText}>Start Analysis</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.ghostButton, !videoUri && styles.buttonDisabled]}
              disabled={!videoUri}
              onPress={() => setVideoUri(null)}
            >
              <Text style={styles.ghostButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progress}>
            {progressSteps.map((label, index) => (
              <View
                key={label}
                style={[styles.step, index <= currentStep && styles.stepActive]}
              >
                <Text style={[styles.stepLabel, index <= currentStep && styles.stepLabelActive]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {videoUri && (
            <View style={styles.preview}>
              <Video
                source={{ uri: videoUri }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
              />
              <Text style={styles.feedbackText}>{feedback}</Text>
              {error && (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorText}>Error: {error}</Text>
                </View>
              )}
              {analysisResult && (
                <View style={styles.analysisResult}>
                  <Text style={styles.analysisResultTitle}>Analysis Result</Text>
                  <Text style={styles.analysisResultText}>
                    Status: {analysisResult.message}
                  </Text>
                </View>
              )}
            </View>
          )}

          {annotatedVideoUrl && (
            <View style={styles.annotatedCard}>
              <View style={styles.annotatedHeader}>
                <Text style={styles.annotatedTitle}>Annotated Video</Text>
                <Text style={styles.annotatedSubtitle}>
                  Each pose was marked by MediaPipe's Google model.
                </Text>
              </View>
              <Video
                source={{ uri: annotatedVideoUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
              />
              {firstSample.length > 0 && (
                <View style={styles.keypointGrid}>
                  {firstSample.slice(0, 6).map((point) => (
                    <View key={point.name} style={styles.keypoint}>
                      <Text style={styles.keypointName}>
                        {point.name.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.keypointMeta}>
                        Visibility: {(point.visibility * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <AnalysisSummary />
        <Recommendations />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Use Expo Go on your iPhone to test this app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050506',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8f8f8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#b0b4c6',
    lineHeight: 20,
  },
  uploadCard: {
    backgroundColor: 'rgba(16, 17, 22, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  uploadStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#b0b4c6',
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusPillText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  fileInput: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  fileInputText: {
    color: '#d6d9e7',
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  ghostButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ghostButtonText: {
    color: '#f4f4f4',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  step: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  stepNumber: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '600',
  },
  stepNumberActive: {
    color: '#a7f3d0',
  },
  stepLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 4,
  },
  stepLabelActive: {
    color: '#a7f3d0',
  },
  preview: {
    marginTop: 16,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 14,
  },
  feedbackText: {
    marginTop: 8,
    color: '#e4e7ff',
    fontSize: 14,
  },
  errorMessage: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  analysisResult: {
    marginTop: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  analysisResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8f8f8',
    marginBottom: 4,
  },
  analysisResultText: {
    fontSize: 14,
    color: '#b0b4c6',
  },
  annotatedCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  annotatedHeader: {
    marginBottom: 12,
  },
  annotatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8f8f8',
  },
  annotatedSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  keypointGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  keypoint: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  keypointName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8f8f8',
  },
  keypointMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(16, 17, 22, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8f8f8',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#b0b4c6',
    lineHeight: 20,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    width: '48%',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8f8f8',
  },
  trend: {
    fontSize: 14,
    color: '#4ade80',
  },
  recItem: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
