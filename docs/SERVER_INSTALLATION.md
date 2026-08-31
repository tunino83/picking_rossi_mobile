# Guida Installazione Server - ROSSI Portal

## Requisiti di Sistema

### Sistema Operativo
- **Windows Server 2019/2022** (raccomandato)
- **Ubuntu 20.04/22.04 LTS**
- **CentOS 8/9**
- **RHEL 8/9**

### Specifiche Hardware Minime
- **CPU**: 2 core
- **RAM**: 4 GB
- **Storage**: 20 GB liberi
- **Rete**: Connessione internet stabile

### Specifiche Hardware Raccomandate
- **CPU**: 4+ core
- **RAM**: 8+ GB
- **Storage**: 50+ GB SSD
- **Rete**: Banda larga dedicata

## Software da Installare

### 1. SQL Server

#### Windows
```powershell
# Scarica SQL Server 2019/2022 Developer/Express (gratuito)
# https://www.microsoft.com/en-us/sql-server/sql-server-downloads

# Oppure SQL Server Standard/Enterprise (a pagamento)
```

#### Linux (Ubuntu/CentOS)
```bash
# Ubuntu
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg
echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/$(lsb_release -rs)/prod $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/mssql-release.list

sudo apt-get update
sudo apt-get install -y mssql-server

# Configura SQL Server
sudo /opt/mssql/bin/mssql-conf setup

# Installa SQL Server command-line tools
sudo apt-get install -y mssql-tools unixodbc-dev
```

### 2. Node.js (versione 18 o superiore)

#### Windows
```powershell
# Scarica da https://nodejs.org/
# Oppure usa Chocolatey
choco install nodejs

# Verifica installazione
node --version
npm --version
```

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verifica installazione
node --version
npm --version
```

### 3. PM2 (Process Manager per Node.js)
```bash
npm install -g pm2
```

### 4. Nginx (Web Server/Reverse Proxy)

#### Windows
```powershell
# Scarica da http://nginx.org/en/download.html
# Oppure usa Chocolatey
choco install nginx
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# Avvia e abilita Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Git (per deployment)
```bash
# Ubuntu/Debian
sudo apt-get install -y git

# CentOS/RHEL
sudo yum install -y git

# Windows
choco install git
```

## Installazione Applicazione

### 1. Clona il Repository
```bash
cd /var/www  # Linux
cd C:\inetpub\wwwroot  # Windows

git clone <your-repository-url> rossi-portal
cd rossi-portal
```

### 2. Installa Dipendenze
```bash
npm install
```

### 3. Configura Environment
```bash
cp .env.example .env
nano .env  # Linux
notepad .env  # Windows
```

Configura le variabili:
```env
# SQL Server Database Configuration
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_NAME=RossiPortal
DB_SERVER=localhost
DB_PORT=1433

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here_min_32_chars
JWT_EXPIRES_IN=24h

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Server Configuration
PORT=3001
NODE_ENV=production
```

### 4. Setup Database
```bash
# Connettiti a SQL Server e esegui:
sqlcmd -S localhost -U sa -P YourPassword -i database/schema.sql
```

### 5. Build Applicazione
```bash
npm run build
```

### 6. Configura PM2
```bash
# Crea file ecosystem
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rossi-portal',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Crea cartella logs
mkdir logs

# Avvia applicazione
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Configura Nginx

#### Linux
```bash
sudo nano /etc/nginx/sites-available/rossi-portal
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve static files
    location / {
        root /var/www/rossi-portal/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Abilita sito
sudo ln -s /etc/nginx/sites-available/rossi-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Windows (nginx.conf)
```nginx
http {
    server {
        listen 80;
        server_name localhost;

        location / {
            root C:/inetpub/wwwroot/rossi-portal/dist;
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## Configurazione SSL (HTTPS)

### Con Let's Encrypt (Linux)
```bash
# Installa Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Ottieni certificato
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Aggiungi: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Con certificato personalizzato
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # ... resto della configurazione
}
```

## Firewall e Sicurezza

### Linux (UFW)
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1433/tcp  # Solo se SQL Server è remoto
sudo ufw enable
```

### Windows Firewall
```powershell
# Apri porte necessarie
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
```

## Monitoraggio e Logs

### PM2 Monitoring
```bash
# Visualizza status
pm2 status

# Visualizza logs
pm2 logs

# Monitoring in tempo reale
pm2 monit

# Restart applicazione
pm2 restart rossi-portal
```

### Log Files
- **Applicazione**: `./logs/`
- **Nginx**: `/var/log/nginx/` (Linux)
- **SQL Server**: `/var/opt/mssql/log/` (Linux)

## Backup e Manutenzione

### Backup Database
```sql
BACKUP DATABASE RossiPortal 
TO DISK = '/var/backups/rossi-portal-backup.bak'
WITH FORMAT, INIT;
```

### Script di Backup Automatico
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
sqlcmd -S localhost -U sa -P $DB_PASSWORD -Q "BACKUP DATABASE RossiPortal TO DISK = '/var/backups/rossi-portal-$DATE.bak'"
find /var/backups -name "rossi-portal-*.bak" -mtime +7 -delete
```

### Aggiornamenti
```bash
# Pull nuove modifiche
git pull origin main

# Installa nuove dipendenze
npm install

# Rebuild
npm run build

# Restart
pm2 restart rossi-portal
```

## Troubleshooting

### Problemi Comuni

1. **Connessione Database**
   ```bash
   # Testa connessione
   sqlcmd -S localhost -U sa -P YourPassword
   ```

2. **Porte in uso**
   ```bash
   # Linux
   netstat -tulpn | grep :3001
   
   # Windows
   netstat -an | findstr :3001
   ```

3. **Logs errori**
   ```bash
   pm2 logs rossi-portal --err
   ```

4. **Nginx errori**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## Contatti e Supporto

Per supporto tecnico:
- Controlla i logs dell'applicazione
- Verifica la configurazione del database
- Controlla la connettività di rete
- Verifica i permessi dei file

## Checklist Post-Installazione

- [ ] SQL Server installato e configurato
- [ ] Database RossiPortal creato
- [ ] Node.js e PM2 installati
- [ ] Applicazione clonata e configurata
- [ ] File .env configurato correttamente
- [ ] Database schema eseguito
- [ ] Applicazione builddata
- [ ] PM2 configurato e avviato
- [ ] Nginx configurato
- [ ] SSL configurato (se necessario)
- [ ] Firewall configurato
- [ ] Backup automatico configurato
- [ ] Test login funzionante
- [ ] Test invio email 2FA funzionante