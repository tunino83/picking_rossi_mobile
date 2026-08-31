# Android Build Guide - Rossi Mobile

Guida rapida per buildare e lanciare l'applicazione Android.

## Prerequisiti

- Node.js installato
- Android Studio installato
- Java JDK configurato
- Dispositivo Android collegato oppure emulatore avviato

## Comandi Principali

### 1. **Installare dipendenze** (prima volta)
```bash
npm install
```

### 2. **Sviluppo locale (Web)**
Avvia il server web e l'app frontend simultaneamente:
```bash
npm run dev
```

Oppure con il dummy server:
```bash
npm run dev-dummy
```

Oppure tutti e tre i servizi (server reale, dummy server, app web):
```bash
npm run dev-both
```

### 3. **Build per Android**

#### Step 1: Build il frontend
```bash
npm run build-gui
```

#### Step 2: Sincronizzazione con Capacitor
```bash
npx cap sync android
```

#### Step 3: Apertura in Android Studio
```bash
start android
```

Oppure apri manualmente la cartella `android/` con Android Studio.

### 4. **Compilazione in Android Studio**

Una volta aperto in Android Studio:

- **Build il progetto:**
  - Menu: `Build → Make Project` 
  - Scorciatoia: `Ctrl + F9`

- **Esegui su dispositivo/emulatore:**
  - Menu: `Run → Run 'app'`
  - Scorciatoia: `Shift + F10`

### 5. **View dei log**
```bash
adb logcat
```

Oppure direttamente in Android Studio:
- Menu: `View → Tool Windows → Logcat`

## Workflow Completo (da zero)

```bash
# 1. Installa dipendenze
npm install

# 2. Build il frontend
npm run build-gui

# 3. Sincronizza con Android
npx cap sync android

# 4. Apri Android Studio
start android
```

Poi in Android Studio:
- Clicca su `Run 'app'` oppure premi `Shift + F10`

## Troubleshooting

### Gradle non sincronizza
- File → Sync Now
- Cancella la cartella `.gradle` nella home directory

### Errore compilazione APK
- Pulisci il progetto: `Build → Clean Project`
- Poi ricompila: `Build → Make Project`

### Dispositivo non riconosciuto
```bash
adb devices
adb kill-server
adb start-server
```

### Porta in uso
Se la porta 3001 o 3002 è occupata, modifica in `.env`:
```
PORT=3001
```

## File Importanti

- `capacitor.config.ts` - Configurazione Capacitor
- `package.json` - Dipendenze e script
- `android/` - Progetto Android completo
- `dist-gui/` - Build frontend (generato dopo build)

## Build APK per Distribution

In Android Studio:
1. Menu: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
2. Oppure per release firmato: `Build → Generate Signed Bundle / APK`

Segui la procedura guidata di Android Studio.

---

**Nota:** Il primo build può impiegare 5-10 minuti. I successivi saranno più veloci.
