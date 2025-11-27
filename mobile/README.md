# Movement Analysis - React Native/Expo Go App

Diese App ist die mobile Version der Movement Analysis Anwendung, entwickelt mit React Native und Expo Go.

## Voraussetzungen

1. **Expo Go App** auf deinem iPhone installieren (aus dem App Store)
2. **Backend läuft** auf deinem Computer (Port 8000)
3. **Gleiche WLAN-Verbindung** für Computer und iPhone

## Setup & Start

### 1. Backend starten (falls noch nicht läuft)

```bash
cd ../backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Mobile App starten

```bash
cd mobile
npm start
```

### 3. API-Adresse anpassen

**WICHTIG:** Öffne `App.tsx` und ändere die `API_BASE` Konstante:

```typescript
// Zeile 74: Ersetze localhost mit der IP-Adresse deines Computers
const API_BASE = 'http://192.168.x.x:8000'; // Deine Computer-IP hier eintragen
```

So findest du deine IP-Adresse:
- **macOS**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Oder in den Systemeinstellungen → Netzwerk

### 4. App in Expo Go öffnen

1. Scanne den QR-Code im Terminal mit der Expo Go App
2. Die App wird auf deinem iPhone geladen
3. Erlaube Zugriff auf Fotos/Videos wenn gefragt

## Funktionen

Die App bietet die gleichen Funktionen wie die Web-Version:

- ✅ **Video-Upload** aus der Galerie
- ✅ **Bewegungsanalyse** mit MediaPipe
- ✅ **Annotiertes Video** mit Pose-Landmarks
- ✅ **KI-Auswertung** mit Mock-Daten
- ✅ **Persönliche Empfehlungen**

## Kommunikation mit Backend

Die App kommuniziert über die gleiche REST API wie das Web-Frontend:

- **POST** `/upload` - Video hochladen und analysieren
- **GET** `/uploads/{filename}` - Annotiertes Video abrufen

Die Kommunikation bleibt unverändert - nur die UI ist für mobile Geräte optimiert.

## Troubleshooting

### "Network request failed"
- Stelle sicher, dass Backend und iPhone im gleichen WLAN sind
- Überprüfe die IP-Adresse in `API_BASE`
- Teste ob Backend erreichbar ist: `http://DEINE-IP:8000` im Browser

### Video wird nicht hochgeladen
- Überprüfe Backend-Logs auf Fehler
- Stelle sicher, dass das Backend mit `--host 0.0.0.0` gestartet wurde
- Prüfe Firewall-Einstellungen auf dem Computer

### App lädt nicht in Expo Go
- Stelle sicher, dass beide Geräte im gleichen Netzwerk sind
- Versuche den Dev-Server neu zu starten: `npm start --clear`

## Entwicklung

```bash
# Dev-Server starten
npm start

# Auf iOS Simulator (benötigt Xcode)
npm run ios

# Auf Android Emulator (benötigt Android Studio)
npm run android

# Im Web-Browser
npm run web
```
