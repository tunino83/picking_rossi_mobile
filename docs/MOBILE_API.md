# Mobile API Documentation

## Base URL
```
http://localhost:3001/api
```

Per produzione, sostituisci con l'URL del tuo server.

## Autenticazione

Tutti gli endpoint (eccetto login) richiedono un Bearer token nell'header Authorization:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Autenticazione

#### POST /auth/login
Login con email e password (primo step del 2FA)

**Request:**
```json
{
  "email": "user@rossi.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Verification code sent to your email",
  "requiresVerification": true
}
```

#### POST /auth/verify
Verifica codice 2FA e completa il login

**Request:**
```json
{
  "email": "user@rossi.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@rossi.com",
    "FIRST_NAME": "Nome",
    "LAST_NAME": "Cognome",
    "name": "Nome Cognome",
    "role": "warehouse"
  },
  "token": "jwt-token-here",
  "message": "Login successful"
}
```

### Ordini

#### GET /orders
Ottieni gli ordini assegnati all'utente autenticato

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "title": "Order #12345",
      "description": "Multiple gearbox components",
      "status": "pending",
      "assignedTo": "uuid",
      "createdAt": "2024-03-10T10:00:00Z",
      "updatedAt": "2024-03-10T10:00:00Z",
      "products": [
        {
          "id": "uuid",
          "orderId": "uuid",
          "productId": "uuid",
          "status": "da_prendere",
          "quantity": 2,
          "productName": "Gear motor R-C32 180",
          "productCode": "GM-RC32-180",
          "productAisle": "A",
          "productShelf": "12",
          "productPosition": "3",
          "productWeight": 5.2
        }
      ]
    }
  ],
  "total": 1
}
```

#### PUT /orders/status
Aggiorna lo stato di un ordine

**Request:**
```json
{
  "orderId": "uuid",
  "status": "processing"
}
```

**Response:**
```json
{
  "message": "Order status updated successfully"
}
```

#### PUT /orders/product-status
Aggiorna lo stato di un prodotto in un ordine

**Request:**
```json
{
  "orderId": "uuid",
  "productId": "uuid",
  "status": "preso"
}
```

**Response:**
```json
{
  "message": "Product status updated successfully"
}
```

### Prodotti

#### GET /products
Ottieni lista prodotti

**Query Parameters:**
- `search` (opzionale): Ricerca per nome o codice
- `limit` (opzionale): Numero di prodotti da restituire (default: 50)
- `offset` (opzionale): Numero di prodotti da saltare (default: 0)

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Gear motor R-C32 180",
      "code": "GM-RC32-180",
      "aisle": "A",
      "shelf": "12",
      "position": "3",
      "weight": 5.2,
      "stock": 25
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### GET /products/search
Ricerca prodotti

**Query Parameters:**
- `q` (richiesto): Query di ricerca

**Response:**
```json
{
  "products": [...],
  "total": 5,
  "query": "gear"
}
```

#### GET /products/:id
Ottieni prodotto specifico per ID

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Gear motor R-C32 180",
    "code": "GM-RC32-180",
    "aisle": "A",
    "shelf": "12",
    "position": "3",
    "weight": 5.2,
    "stock": 25
  }
}
```

### Utenti

#### GET /users/profile
Ottieni profilo utente corrente

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@rossi.com",
    "FIRST_NAME": "Nome",
    "LAST_NAME": "Cognome",
    "name": "Nome Cognome",
    "role": "warehouse"
  }
}
```

### Impostazioni

#### GET /settings
Ottieni tutte le impostazioni di sistema

**Response:**
```json
{
  "settings": [
    {
      "id": "uuid",
      "name": "ERP-Rate-Sync",
      "description": "Frequenza Aggiornamento ERP in minuti",
      "value": "5",
      "updatedAt": "2024-03-10T10:00:00Z",
      "updatedBy": "uuid"
    }
  ],
  "total": 1
}
```

## Codici di Errore

- `400` - Bad Request (parametri mancanti o non validi)
- `401` - Unauthorized (token mancante o non valido)
- `403` - Forbidden (permessi insufficienti)
- `404` - Not Found (risorsa non esistente)
- `500` - Internal Server Error

## Valori Status

### Stato Prodotti
- `da_prendere` - Da prendere
- `preso` - Preso
- `non_presente` - Non presente

### Stato Ordini
- `pending` - In attesa
- `processing` - In lavorazione
- `completed` - Completato

### Ruoli Utente
- `admin` - Accesso completo
- `warehouse` - Gestione ordini e prodotti
- `orders` - Visualizzazione ordini assegnati

## Esempio di Integrazione React Native

```javascript
const API_BASE_URL = 'http://localhost:3001/api';

class RossiAPI {
  constructor() {
    this.token = null;
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async verify2FA(email, code) {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await response.json();
    if (data.token) {
      this.token = data.token;
    }
    return data;
  }

  async getOrders() {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: { 
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async updateProductStatus(orderId, productId, status) {
    const response = await fetch(`${API_BASE_URL}/orders/product-status`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId, productId, status })
    });
    return response.json();
  }
}

export default new RossiAPI();
```