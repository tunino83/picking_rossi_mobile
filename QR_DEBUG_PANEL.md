# QR Scanner Debug Panel Implementation

## Overview
Implemented a visible debug panel that displays QR scanner keyboard events in real-time within the WebView APK. Since console.log is invisible in WebView, this panel shows all events directly on the app page.

## Changes Made

### 1. Debug Log State Management (MyOrderList.tsx)
- Added state: `const [debugLog, setDebugLog] = useState<string[]>([])`
- Created function: `addDebugLog(message)` that:
  - Adds timestamp to each log entry
  - Maintains circular buffer of last 20 logs
  - Also calls console.log for Chrome DevTools fallback

### 2. Updated Keyboard Event Handler
The `handleKeyDown` function now logs all keyboard events:
```
- 🔴 KEYDOWN EVENT - handleKeyDown attivo (event detected)
- Event type, key, code, keyCode (all event properties)
- isTextInput? (checks if user is typing in regular input)
- 📝 Buffer: [accumulated characters] (shows QR data being accumulated)
- ✅ Rilevato tasto finale: Enter/Tab (detects scanner terminator)
- 📦 QR Scansionato: [complete QR data] (complete scan captured)
- ✅ JSON parsato correttamente (if JSON parse succeeds)
```

### 3. Debug Panel UI Component
Added at bottom-left of screen when logs exist:
- **Background**: Dark gray (#gray-900) with green text
- **Border**: Green with 2px border
- **Font**: Monospace, small text (xs)
- **Position**: Fixed at bottom-left, scrollable if >48 items
- **Max height**: 48 lines (scrollable)
- **Title**: 🔍 DEBUG LOG in green text
- **Auto-displays**: When debugLog.length > 0

### 4. Version Badge Update
- Updated from `v2.1-QR-Scanner` to `v2.2-DebugPanel`
- Added debug counter badge showing number of log entries
- Format: `🔴 DEBUG: [count]`

### 5. Listener Registration Logging
When the component mounts, logs:
- `✅ QR Scanner listener registered - handleKeyDown active`

## Troubleshooting Guide

### If Debug Panel is NOT visible:
1. **Keyboard events not reaching the app**: The Zebra scanner might need configuration
   - Check DataWedge settings on tablet
   - Ensure physical button is mapped to keyboard input
   
2. **Events visible but showing undefined**: 
   - e.key returns undefined = events might be synthetic/emulated
   - Try accessing e.keyCode or e.code instead
   - May need different event properties for Zebra scanner

3. **Buffer accumulating but not parsing**:
   - Check if QR data format matches expected JSON or query-string
   - Verify terminator key is correct (Enter or Tab)

### To Debug the Zebra Scanner:
1. Open MyOrderList component in running app
2. Watch the debug panel at bottom-left
3. Press the physical QR button on tablet
4. Observe logs to see:
   - All keyboard events captured
   - Characters being accumulated
   - Terminator key detection
   - Final QR data parsed

## Testing Workflow

```bash
# Build the GUI
npm run build-gui

# Sync to Android
npx cap sync android

# Open Android Studio and run on device/emulator
start android

# Watch MyOrderList page and observe debug panel
```

## Log Message Format Reference

| Icon | Message | Meaning |
|------|---------|---------|
| 🔴 | KEYDOWN EVENT | Raw keyboard event detected |
| 📝 | Buffer: | QR data being accumulated character by character |
| ✅ | Rilevato tasto finale | Scanner terminator (Enter/Tab) detected |
| 📦 | QR Scansionato | Complete scan received |
| ✅ | JSON parsato | Successfully parsed as JSON |

## Notes
- Maximum 20 log entries retained (circular buffer)
- Timestamps in HH:MM:SS format
- All entries also logged to console for Chrome DevTools
- Panel scrolls vertically if log count exceeds visible area
- Green styling helps distinguish from regular app UI

## Next Steps
1. Deploy to actual Zebra tablet
2. Use debug panel to verify QR events are received correctly
3. Once events are working, remove debug logging and integrate QR data into order workflow
4. Remove debug panel before production (or make it toggleable)
