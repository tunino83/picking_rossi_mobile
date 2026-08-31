# SQL Server Setup Guide

## Prerequisiti

1. **SQL Server** (2019 o superiore)
2. **SQL Server Management Studio (SSMS)** o **Azure Data Studio**
3. **Node.js** (18 o superiore)

## Setup Database

### 1. Creare il Database

```sql
CREATE DATABASE RossiPortal;
USE RossiPortal;
```

### 2. Eseguire lo Schema

Esegui il file `database/schema.sql` per creare tutte le tabelle, indici e dati di esempio.

### 3. Configurare la Connessione

Copia `.env.example` in `.env` e configura:

```env
# SQL Server Database Configuration
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=RossiPortal
DB_SERVER=localhost
DB_PORT=1433

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Email Configuration (for 2FA)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Configurazione Email per 2FA

### Gmail Setup

1. Abilita l'autenticazione a 2 fattori sul tuo account Gmail
2. Genera una "App Password" specifica per questa applicazione
3. Usa la App Password nel campo `EMAIL_PASS`

### Altri Provider

Per altri provider email, modifica `EMAIL_HOST` e `EMAIL_PORT` di conseguenza:

- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587
- **Custom SMTP**: configura secondo le specifiche del tuo provider

## Avvio dell'Applicazione

### Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia sia il server che il client
npm run dev
```

Questo comando avvierà:
- **Backend API**: http://localhost:3001
- **Frontend React**: http://localhost:5173

### Solo Backend

```bash
npm run server
```

### Solo Frontend

```bash
npm run client
```

## Utenti di Default

Lo schema crea automaticamente questi utenti:

| Email | Password | Ruolo |
|-------|----------|-------|
| admin@rossi.com | admin123 | admin |
| warehouse@rossi.com | warehouse123 | warehouse |
| orders@rossi.com | orders123 | orders |

## Struttura Database

### Tabelle Principali

- **Users**: Utenti del sistema con ruoli
- **Orders**: Ordini di lavoro
- **Products**: Prodotti in magazzino
- **OrderProducts**: Relazione ordini-prodotti
- **Settings**: Impostazioni di sistema
- **TwoFactorCodes**: Codici 2FA temporanei

### Ruoli Utente

- **admin**: Accesso completo a tutte le funzionalità
- **warehouse**: Gestione ordini e prodotti
- **orders**: Visualizzazione e aggiornamento ordini assegnati

## API Endpoints

Il backend espone le seguenti API REST:

### Autenticazione
- `POST /api/auth/login` - Login (primo step 2FA)
- `POST /api/auth/verify` - Verifica codice 2FA

### Utenti
- `GET /api/users` - Lista utenti (solo admin)
- `GET /api/users/profile` - Profilo utente corrente
- `POST /api/users` - Crea nuovo utente (solo admin)

### Ordini
- `GET /api/orders` - Lista ordini
- `PUT /api/orders/status` - Aggiorna stato ordine
- `PUT /api/orders/product-status` - Aggiorna stato prodotto

### Prodotti
- `GET /api/products` - Lista prodotti
- `GET /api/products/search` - Ricerca prodotti

### Impostazioni
- `GET /api/settings` - Lista impostazioni
- `PUT /api/settings` - Aggiorna impostazioni (solo admin)

## Sicurezza

### Autenticazione
- Login con email/password + 2FA
- JWT tokens con scadenza configurabile
- Hash delle password con bcrypt

### Autorizzazione
- Controllo ruoli per ogni endpoint
- Middleware di autenticazione per API protette

### Database
- Parametri SQL per prevenire SQL injection
- Trigger per aggiornamento automatico timestamp
- Indici per performance ottimali

## Monitoraggio

### Health Check
- `GET /api/health` - Stato del server

### Logs
Il server logga automaticamente:
- Connessioni database
- Errori API
- Tentativi di login

## Backup e Manutenzione

### Backup Database
```sql
BACKUP DATABASE RossiPortal 
TO DISK = 'C:\Backup\RossiPortal.bak'
```

### Pulizia Automatica
Il server pulisce automaticamente i codici 2FA scaduti ogni ora.

### Monitoraggio Performance
Usa SQL Server Profiler o Extended Events per monitorare le query e ottimizzare le performance.