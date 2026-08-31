# Configurazione IIS per ROSSI Portal

## Prerequisiti

### Software Necessari
- **Windows Server 2019/2022** o **Windows 10/11 Pro**
- **IIS** con moduli necessari
- **Node.js 18+**
- **PM2** per gestione processi Node.js
- **SQL Server**

## Installazione e Configurazione IIS

### 1. Abilita IIS e Moduli Necessari

#### Via PowerShell (Amministratore)
```powershell
# Abilita IIS
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole

# Abilita moduli necessari
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent
Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument
Enable-WindowsOptionalFeature -Online -FeatureName IIS-DirectoryBrowsing
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole

```

#### Via Server Manager (Windows Server)
1. Apri **Server Manager**
2. Clicca **Add Roles and Features**
3. Seleziona **Web Server (IIS)**
4. Aggiungi questi moduli:
   - **Application Request Routing (ARR)**
   - **URL Rewrite Module**
   - **Static Content**
   - **Default Document**
   - **HTTP Errors**
   - **HTTP Logging**

### 2. Installa Moduli Aggiuntivi

#### Application Request Routing (ARR)
```powershell
# Scarica e installa ARR 3.0
# https://www.iis.net/downloads/microsoft/application-request-routing
```

#### URL Rewrite Module
```powershell
# Scarica e installa URL Rewrite Module 2.1
# https://www.iis.net/downloads/microsoft/url-rewrite
```

## Configurazione Applicazione

### 1. Preparazione File
```powershell
# Crea cartella applicazione
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\rossi-portal"

# Copia file applicazione
# Copia il contenuto della cartella dist/ in C:\inetpub\wwwroot\rossi-portal\
```

### 2. Configurazione PM2 per Node.js
```powershell
# Installa PM2 globalmente
npm install -g pm2
npm install -g pm2-windows-service

# Naviga nella cartella dell'applicazione
cd "C:\inetpub\wwwroot\rossi-portal"

# Installa dipendenze
npm install

# Crea file ecosystem per PM2
```

### 3. File ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'rossi-portal-api',
    script: 'server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'C:\\logs\\rossi-portal\\err.log',
    out_file: 'C:\\logs\\rossi-portal\\out.log',
    log_file: 'C:\\logs\\rossi-portal\\combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

### 4. Avvia Servizio Node.js
```powershell
# Crea cartella logs
New-Item -ItemType Directory -Path "C:\logs\rossi-portal" -Force

# Avvia applicazione con PM2
pm2 start ecosystem.config.js

# Installa come servizio Windows
pm2-service-install
pm2-service-start

# Salva configurazione PM2
pm2 save
```

## Configurazione IIS

### 1. Crea Sito Web in IIS

#### Via IIS Manager
1. Apri **IIS Manager**
2. Click destro su **Sites** → **Add Website**
3. Configura:
   - **Site name**: `ROSSI Portal`
   - **Physical path**: `C:\inetpub\wwwroot\rossi-portal\dist`
   - **Port**: `80` (e `443` per HTTPS)
   - **Host name**: `your-domain.com` (opzionale)

#### Via PowerShell
```powershell
# Importa modulo WebAdministration
Import-Module WebAdministration

# Crea nuovo sito
New-Website -Name "ROSSI Portal" -Port 80 -PhysicalPath "C:\inetpub\wwwroot\rossi-portal\dist"

# Configura binding HTTPS (se hai certificato)
New-WebBinding -Name "ROSSI Portal" -Protocol https -Port 443
```

### 2. Configura URL Rewrite per API

Crea file `web.config` in `C:\inetpub\wwwroot\rossi-portal\dist\`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- Abilita compressione -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    
    <!-- Configurazione MIME types -->
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    
    <!-- URL Rewrite Rules -->
    <rewrite>
      <rules>
        <!-- Proxy API requests to Node.js -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
        </rule>
        
        <!-- SPA Fallback - serve index.html for all non-file requests -->
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- Security Headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
    
    <!-- Error Pages -->
    <httpErrors errorMode="Custom" defaultResponseMode="ExecuteURL">
      <remove statusCode="404" subStatusCode="-1" />
      <error statusCode="404" path="/index.html" responseMode="ExecuteURL" />
    </httpErrors>
    
    <!-- Caching -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
```

### 3. Configura Application Request Routing

#### Via IIS Manager
1. Seleziona il server root in IIS Manager
2. Doppio click su **Application Request Routing Cache**
3. Click **Server Proxy Settings** nel pannello Actions
4. Spunta **Enable proxy**
5. Click **Apply**

#### Via PowerShell
```powershell
# Abilita proxy ARR
Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
```

## Configurazione HTTPS/SSL

### 1. Con Certificato Self-Signed (Sviluppo)
```powershell
# Crea certificato self-signed
$cert = New-SelfSignedCertificate -DnsName "localhost", "your-domain.com" -CertStoreLocation "cert:\LocalMachine\My"

# Bind certificato al sito
New-WebBinding -Name "ROSSI Portal" -Protocol https -Port 443
```

### 2. Con Certificato Commerciale
1. Acquista certificato SSL da CA riconosciuta
2. Installa certificato in **Local Machine\Personal**
3. Bind certificato al sito in IIS Manager

### 3. Con Let's Encrypt (Gratuito)
```powershell
# Installa win-acme
# Scarica da https://www.win-acme.com/
# Segui wizard per configurazione automatica
```

## Configurazione Firewall

```powershell
# Abilita porte necessarie
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Port 1433 -Protocol TCP -Action Allow
```

## Monitoraggio e Logs

### 1. IIS Logs
- **Posizione**: `C:\inetpub\logs\LogFiles\W3SVC1\`
- **Formato**: W3C Extended Log Format

### 2. Node.js Logs (PM2)
- **Error logs**: `C:\logs\rossi-portal\err.log`
- **Output logs**: `C:\logs\rossi-portal\out.log`
- **Combined logs**: `C:\logs\rossi-portal\combined.log`

### 3. Comandi PM2 Utili
```powershell
# Visualizza status
pm2 status

# Visualizza logs in tempo reale
pm2 logs rossi-portal-api

# Restart applicazione
pm2 restart rossi-portal-api

# Monitoring
pm2 monit
```

## Backup e Manutenzione

### 1. Script Backup Database
```powershell
# backup-db.ps1
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\Backups\RossiPortal_$date.bak"

sqlcmd -S localhost -E -Q "BACKUP DATABASE RossiPortal TO DISK = '$backupPath'"

# Rimuovi backup vecchi (>7 giorni)
Get-ChildItem "C:\Backups\RossiPortal_*.bak" | Where-Object {$_.CreationTime -lt (Get-Date).AddDays(-7)} | Remove-Item
```

### 2. Task Scheduler per Backup Automatico
```powershell
# Crea task schedulato per backup giornaliero
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\backup-db.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
Register-ScheduledTask -TaskName "ROSSI Portal DB Backup" -Action $action -Trigger $trigger -Principal $principal
```

## Aggiornamenti Applicazione

### 1. Script di Deploy
```powershell
# deploy.ps1
# Stop PM2 process
pm2 stop rossi-portal-api

# Backup current version
Copy-Item "C:\inetpub\wwwroot\rossi-portal" "C:\Backups\rossi-portal-$(Get-Date -Format 'yyyyMMdd')" -Recurse

# Pull new code
cd "C:\inetpub\wwwroot\rossi-portal"
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Copy dist files to IIS
Copy-Item "dist\*" "C:\inetpub\wwwroot\rossi-portal\dist\" -Recurse -Force

# Restart PM2 process
pm2 restart rossi-portal-api

Write-Host "Deploy completed successfully!"
```

## Troubleshooting

### 1. Problemi Comuni

#### Node.js non raggiungibile
```powershell
# Verifica che PM2 sia in esecuzione
pm2 status

# Verifica porta 3001
netstat -an | findstr :3001

# Restart servizio
pm2 restart rossi-portal-api
```

#### Errori 500 in IIS
```powershell
# Controlla logs IIS
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" | Select-Object -Last 50

# Controlla logs applicazione
pm2 logs rossi-portal-api --err
```

#### Problemi SSL
```powershell
# Verifica binding certificato
Get-WebBinding -Name "ROSSI Portal"

# Test certificato
Test-NetConnection -ComputerName localhost -Port 443
```

### 2. Performance Tuning

#### IIS Application Pool
```powershell
# Configura Application Pool
Set-ItemProperty -Path "IIS:\AppPools\DefaultAppPool" -Name "processModel.idleTimeout" -Value "00:00:00"
Set-ItemProperty -Path "IIS:\AppPools\DefaultAppPool" -Name "recycling.periodicRestart.time" -Value "00:00:00"
```

#### Compressione
```xml
<!-- In web.config -->
<system.webServer>
  <urlCompression doStaticCompression="true" doDynamicCompression="true" />
  <httpCompression>
    <dynamicTypes>
      <add mimeType="application/json" enabled="true" />
      <add mimeType="application/javascript" enabled="true" />
    </dynamicTypes>
  </httpCompression>
</system.webServer>
```

## Checklist Post-Installazione

- [ ] IIS installato con moduli ARR e URL Rewrite
- [ ] Sito web creato e configurato
- [ ] File web.config configurato correttamente
- [ ] Node.js applicazione in esecuzione con PM2
- [ ] Proxy API funzionante (test: http://localhost/api/health)
- [ ] SSL/HTTPS configurato
- [ ] Firewall configurato
- [ ] Backup automatico configurato
- [ ] Logs accessibili e funzionanti
- [ ] Test login applicazione funzionante
- [ ] Test invio email 2FA funzionante

## Vantaggi IIS vs Nginx

### ✅ Vantaggi IIS
- **Integrazione Windows** nativa
- **GUI Management** con IIS Manager
- **Active Directory** integration
- **Windows Authentication** supportata
- **Performance Monitor** integrato
- **Event Viewer** logs centralizzati

### ⚠️ Considerazioni
- **Solo Windows** (non cross-platform)
- **Licenze** Windows Server necessarie
- **Risorse** leggermente superiori vs Nginx

IIS è un'ottima scelta per ambienti Windows aziendali e si integra perfettamente con l'ecosistema Microsoft!