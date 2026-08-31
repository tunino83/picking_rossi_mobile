# API Documentation - ROSSI Portal Mobile Backend

## Base URL
```
https://your-project.supabase.co/functions/v1
```

## Authentication
All API endpoints (except login) require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password (first step of 2FA)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Verification code sent",
  "requiresVerification": true
}
```

#### POST /auth/verify
Verify 2FA code and complete login

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "User Name",
    "role": "warehouse"
  },
  "token": "jwt-token-here",
  "message": "Login successful"
}
```

### Orders

#### GET /orders
Get orders assigned to the authenticated user

**Query Parameters:**
- `limit` (optional): Number of orders to return (default: 50)
- `offset` (optional): Number of orders to skip (default: 0)
- `status` (optional): Filter by status (pending, processing, completed)

**Response:**
```json
{
  "orders": [
    {
      "id": "1",
      "title": "Order #12345",
      "description": "Multiple gearbox components",
      "status": "pending",
      "assignedTo": "2",
      "createdAt": "2024-03-10T10:00:00Z",
      "updatedAt": "2024-03-10T10:00:00Z",
      "products": [
        {
          "id": "1-1",
          "orderId": "1",
          "productId": "1",
          "product": {
            "id": "1",
            "name": "Gear motor R-C32 180",
            "code": "GM-RC32-180",
            "aisle": "A",
            "shelf": "12",
            "position": "3",
            "weight": 5.2
          },
          "status": "da_prendere",
          "quantity": 2
        }
      ]
    }
  ],
  "total": 1
}
```

#### PUT /orders/status
Update order status

**Request Body:**
```json
{
  "orderId": "1",
  "status": "processing"
}
```

**Response:**
```json
{
  "message": "Order status updated successfully",
  "orderId": "1",
  "newStatus": "processing"
}
```

#### PUT /orders/product-status
Update product status within an order

**Request Body:**
```json
{
  "orderId": "1",
  "productId": "1",
  "status": "preso"
}
```

**Response:**
```json
{
  "message": "Product status updated successfully",
  "orderId": "1",
  "productId": "1",
  "newStatus": "preso"
}
```

### Products

#### GET /products
Get products list

**Query Parameters:**
- `search` (optional): Search by name or code
- `limit` (optional): Number of products to return (default: 50)
- `offset` (optional): Number of products to skip (default: 0)

**Response:**
```json
{
  "products": [
    {
      "id": "1",
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
Search products

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "products": [...],
  "total": 5,
  "query": "gear"
}
```

#### GET /products/{id}
Get specific product by ID

**Response:**
```json
{
  "product": {
    "id": "1",
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

### Users

#### GET /users (Admin only)
Get all users

**Response:**
```json
{
  "users": [
    {
      "id": "1",
      "email": "admin@rossi.com",
      "FIRST_NAME": "Marco",
      "LAST_NAME": "Rossi",
      "name": "Marco Rossi",
      "role": "admin"
    }
  ],
  "total": 1
}
```

#### POST /users (Admin only)
Create new user

**Request Body:**
```json
{
  "email": "newuser@rossi.com",
  "FIRST_NAME": "New",
  "LAST_NAME": "User",
  "role": "warehouse"
}
```

#### GET /users/profile
Get current user profile

**Response:**
```json
{
  "user": {
    "id": "1",
    "email": "user@rossi.com",
    "FIRST_NAME": "User",
    "LAST_NAME": "Name",
    "name": "User Name",
    "role": "warehouse"
  }
}
```

#### GET /users/{id}
Get specific user by ID (own profile or admin only)

### Settings

#### GET /settings
Get all system settings

**Response:**
```json
{
  "settings": [
    {
      "id": "1",
      "name": "ERP-Rate-Sync",
      "description": "Frequenza Aggiornamento ERP in minuti",
      "value": "5",
      "updated_at": "2024-03-10T10:00:00Z",
      "updated_by": "1"
    }
  ],
  "total": 1
}
```

#### PUT /settings (Admin only)
Update multiple settings

**Request Body:**
```json
{
  "settings": [
    {
      "id": "1",
      "value": "10"
    },
    {
      "id": "2",
      "value": "Y"
    }
  ]
}
```

#### GET /settings/{name}
Get specific setting by name

**Response:**
```json
{
  "setting": {
    "id": "1",
    "name": "ERP-Rate-Sync",
    "description": "Frequenza Aggiornamento ERP in minuti",
    "value": "5",
    "updated_at": "2024-03-10T10:00:00Z",
    "updated_by": "1"
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Product Status Values

- `da_prendere` - To be picked
- `preso` - Picked
- `non_presente` - Not present

## Order Status Values

- `pending` - Pending
- `processing` - Processing  
- `completed` - Completed

## User Roles

- `admin` - Full access to all features
- `warehouse` - Can manage orders and products
- `orders` - Can view and update assigned orders