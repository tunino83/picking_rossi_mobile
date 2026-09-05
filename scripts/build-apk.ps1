# Builda il frontend, sincronizza Capacitor e genera l'APK Android da riga di comando,
# senza bisogno di aprire Android Studio.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1            (debug, default)
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Release   (release, richiede keystore configurato)

param(
    [switch]$Release
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# gradlew richiede JAVA_HOME; se non e' gia' impostato, usa il JDK incluso in Android Studio
if (-not $env:JAVA_HOME) {
    $candidates = @(
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jre",
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
    )
    $found = $candidates | Where-Object { Test-Path (Join-Path $_ "bin\java.exe") } | Select-Object -First 1
    if ($found) {
        $env:JAVA_HOME = $found
        Write-Host "JAVA_HOME non impostato: uso il JDK di Android Studio ($found)" -ForegroundColor Yellow
    } else {
        throw "JAVA_HOME non impostato e nessun JDK trovato automaticamente. Installa un JDK o imposta JAVA_HOME manualmente."
    }
}

Write-Host "== 1/3: Build frontend (npm run build-gui) ==" -ForegroundColor Cyan
npm run build-gui
if ($LASTEXITCODE -ne 0) { throw "Build del frontend fallita" }

Write-Host "== 2/3: Sincronizzazione Capacitor (npx cap sync android) ==" -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "Sincronizzazione Capacitor fallita" }

Write-Host "== 3/3: Build APK Android (gradlew) ==" -ForegroundColor Cyan
Set-Location (Join-Path $root "android")

if ($Release) {
    .\gradlew.bat assembleRelease
    $apkDir = "app\build\outputs\apk\release"
} else {
    .\gradlew.bat assembleDebug
    $apkDir = "app\build\outputs\apk\debug"
}
if ($LASTEXITCODE -ne 0) { throw "Build Gradle fallita" }

Set-Location $root
$apkPath = Join-Path "android" $apkDir
Write-Host ""
Write-Host "APK generato in: $apkPath" -ForegroundColor Green
Get-ChildItem -Path $apkPath -Filter "*.apk" | ForEach-Object {
    Write-Host " - $($_.Name) ($([math]::Round($_.Length / 1MB, 1)) MB)"
}
