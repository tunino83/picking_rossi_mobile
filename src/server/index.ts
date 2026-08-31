import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { initializeDb } from './db.js';
import * as db from './db.js';
import { AuthenticatedRequest, JWTPayload } from './types.js';
import {User,Order,OrderRow,Warehouse} from '../shared/types';
import dotenv from 'dotenv';
import { logAccess } from './db';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  console.log('Middleware CORS in esecuzione');
  next();
});
// Configurazione centralizzata CORS
if (process.env.NODE_ENV && process.env.NODE_ENV === 'productionXXX') {
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://10.90.1.5:80',
      'http://10.90.1.5',
      'http://10.90.1.5:5173',
      'http://rossi-warehouse-portal.com'
    ],
    credentials: true,
  });
} else {
  // In development allow requests from any origin to simplify local testing (including https://localhost used by the WebView)
  app.use(cors({
    origin: true,
    credentials: true,
  }));
}

// Middleware
app.use(express.json());

// Initialize database
initializeDb().catch(console.error);

// Email transporter for 2FA
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// JWT middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  
  const authReq = req as AuthenticatedRequest;
  const authHeader = authReq.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log('🔑 Token received:', token ? 'Yes' : 'No');

    console.log('DENTRO AUTHENTICATE TOKEN');

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: jwt.VerifyErrors | null, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    authReq.user = decoded as JWTPayload;
    console.log(authReq.user);
    next();
  });
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user || !roles.includes(authReq.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Generate random 6-digit code
const generate2FACode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send 2FA email
const send2FAEmail = async (email: string, code: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'ROSSI Portal - Codice di Verifica',
    html: `
      <h2>ROSSI Portal</h2>
      <p>Il tuo codice di verifica è:</p>
      <h1 style="color: #dc2626; font-size: 32px; letter-spacing: 4px;">${code}</h1>
      <p>Questo codice scadrà tra 10 minuti.</p>
      <p>Se non hai richiesto questo codice, ignora questa email.</p>
    `,
  };

  await emailTransporter.sendMail(mailOptions);
};

// Routes

// Authentication
app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    // ...dentro la route di login...
    let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    ipAddress = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress;

    const userAgent = req.headers['user-agent'] || '';

    
    console.log('🔐 REAL SERVER - Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user from database
    const user = await db.getUserByEmail(email) as User;
    console.log('👤 User found:', user ? 'Yes' : 'No');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    }

    // Verify password (BEFORE checking if enabled)
    const trimmedHash = user.passwordHash? user.passwordHash.trim(): '';
    const isValidPassword = await bcrypt.compare(password, trimmedHash);

    console.log('🔑 Password valid:', isValidPassword);
    if (!isValidPassword) {
      
       /* bcrypt.hash(password, 10, (err, hash) => {
          if (err) throw err;
        });
        */
         // Login fallito
        await logAccess(
          user.id,
          req.body.email,
          ipAddress,
          userAgent,
          false,
          'Login failed'
        );
      return res.status(403).json({ error: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    }

    // Check if user is enabled (AFTER password verification)
    if (user.enabled !== 1) {
      await logAccess(
        user.id,
        email,
        ipAddress,
        userAgent,
        false,
        'Login failed - user disabled'
      );
      return res.status(403).json({ error: 'User account is disabled', errorCode: 'USER_DISABLED' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate and send 2FA code
      const code = generate2FACode();
      await db.store2FACode(email, code);
      await send2FAEmail(email, code);
      
      console.log('📱 2FA code sent to:', email);
      res.json({
        message: 'Verification code sent to your email',
        requiresVerification: true
      });
    } else {
      // Direct login without 2FA
      console.log('✅ Direct login successful (2FA disabled)');
      
      // Generate JWT token
      const payload = {
        id: user.id ,
        email: user.email ,
        role: user.role ,
        warehouse: user.WAREHOUSE_CODE || '',
        warehouse_name: user.WAREHOUSE_NAME || '',
        language: user.WAREHOUSE_COUNTRY === 'it' ? 'it' : 'en'
      };

      const token = jwt.sign(
        payload as string | object,
        process.env.JWT_SECRET!
      );

      const { passwordHash, ...userWithoutPassword } = user;

        // Login riuscito
        await logAccess(
          user.id,
          user.email,
          ipAddress,
          userAgent,
          true,
          'Login successful'
        );
      
      res.json({
        user: userWithoutPassword,
        token,
        message: 'Login successful (2FA disabled)'
      });
    }
  } catch (error) {
    console.error('❌ REAL SERVER - Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify', async (req: express.Request, res: express.Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    // Verify 2FA code
    const isValidCode = await db.verify2FACode(email, code);
    if (!isValidCode) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Get user data
    const user = await db.getUserByEmail(email) as User;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate JWT token
    const payload = {
      id: user.id ,
      email: user.email ,
      role: user.role ,
      warehouse: user.WAREHOUSE_CODE || '',
      warehouse_name: user.WAREHOUSE_NAME || '',
      language: user.WAREHOUSE_COUNTRY === 'it' ? 'it' : 'en'
    };

    const token = jwt.sign(
      payload as string | object,
       process.env.JWT_SECRET!
    );
   
    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ REAL SERVER - Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users
app.get('/api/users', authenticateToken, requireRole(['admin','orders']), async (req: express.Request, res: express.Response) => {
  try {
      const authReq = req as AuthenticatedRequest;
      const filtersObj: Record<string, any> = ((authReq.user.role !== 'admin' ) )
      ? {warehouse: authReq.user.warehouse}
      : {  };    

    if ('role' in req.query) {
      filtersObj.role = req.query.role;
    }

    const users = await db.getUsers(filtersObj);
    res.json({ users, total: users.length });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await db.getUserById(authReq.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    
    // Users can only view their own profile, admins can view all
    if (authReq.user.role !== 'admin' && authReq.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req: express.Request, res: express.Response) => {
  try {
    const { email, FIRST_NAME, LAST_NAME, role, password, WAREHOUSE_CODE } = req.body;

    if (!email || !FIRST_NAME || !LAST_NAME || !role || !password ) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.createUser({
      email,
      FIRST_NAME,
      LAST_NAME,
      role,
      passwordHash,
      WAREHOUSE_CODE
    }) as any;

console.log(result);

    res.status(201).json({
      message: 'User created successfully',
      userId: result[0].id
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Orders
app.get('/api/orders/:id', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orderId = req.params.id;

    // Recupera l'ordine
    const order = await db.getOrderById(orderId) as Order;

    // Se l'ordine non esiste
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Controllo di autorizzazione (se non admin, deve essere assegnato a lui)
    const isAdmin = authReq.user.role === 'admin';
    if (!isAdmin && order.ASSIGNED_USER_ID !== parseInt(authReq.user.id)) {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }

    // Recupera i dettagli (ROWS) dell'ordine
    const ROWS = await db.getOrderRows(order.LIST_HEADER_ID);

    // Ritorna l'ordine completo
    res.json({ ...order, ROWS });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/orders', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const showMyList = 'myList' in req.query; // controlla se il flag ?myList è presente
    const filtersObj: Record<string, any> = ((authReq.user.role === 'orders' || authReq.user.role === 'admin') && !showMyList)
      ? {}
      : { assignedTo: authReq.user.id };    
    // Se nella query è presente il parametro `id`, lo aggiungiamo ai filtri
    
    if(authReq.user.role !== 'admin'){
      
      filtersObj.warehouse = authReq.user.warehouse;
    }

    if ('id' in req.query) {
      filtersObj.id = req.query.id;
    }

    if ('status' in req.query) {
      filtersObj.status = req.query.status;
    }

    if ('userId' in req.query) {
      filtersObj.assignedTo = req.query.userId;
    }

    console.log(filtersObj);
    const orders = await db.getOrders(filtersObj) as Order[];

    const withDetails = req.query.withDetails ;
    // Get rows for each order
    
    
    let ordersFull;

    ordersFull = await Promise.all(
      orders.map(async (order) => {
        let ROWS: OrderRow[] = [];
        if (withDetails === "ALL") {
          ROWS = await db.getOrderRows(order.LIST_HEADER_ID,filtersObj) as OrderRow[];
        } else if (withDetails === "NC" && order.STATUS !== "COMPLETED") {
          ROWS = await db.getOrderRows(order.LIST_HEADER_ID,filtersObj) as OrderRow[];
        }
        // Negli altri casi ROWS resta []
        return { ...order, ROWS };
      })
      );
    
    res.json({ orders: ordersFull, total: ordersFull.length });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/orders/assign', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ error: 'Order ID and user ID required' });
    }

    await db.assignOrder(orderId, userId);
    res.json({ message: 'Order assigned successfully' });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/orders/assignRows', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { rowIds, userId } = req.body;

    if (!rowIds || !userId) {
      return res.status(400).json({ error: 'Row IDs and user ID required' });
    }

    await db.assignOrderRows(rowIds, userId);
    res.json({ message: 'Order rows assigned successfully' });
  } catch (error) {
    console.error('Assign order rows error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/orders/transactionLog', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    
    const { type, headerId, bodyId, quantity, userEmail } = req.body;

    if (!type ||!headerId || !userEmail) {
      return res.status(400).json({ error: 'Type ,Header ID User Email are required' });
    }

    await db.addTransactionLog(type,{headerId, bodyId, quantity, userEmail});
    res.json({ message: 'Order closed successfully' });
  } catch (error) {
    console.error('Close order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// STOCK endpoint: list stock rows (supports optional warehouseCode query)
app.get('/api/stock', authenticateToken, requireRole(['admin','warehouse']), async (req: express.Request, res: express.Response) => {
  try {
    const warehouseCode = (req.query.warehouseCode as string) || undefined;
    const limit = parseInt((req.query.limit as string) || '25', 10) || 25;
    const page = parseInt((req.query.page as string) || '1', 10) || 1;
    const offset = Math.max(0, (page - 1) * limit);

    const { rows, total } = await db.getStock(warehouseCode, limit, offset);
    res.json({ stock: rows, total, page, limit });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create / update stock entry
app.post('/api/stock', authenticateToken, requireRole(['admin','warehouse']), async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { itemCode, locationCode, warehouseCode, quantity } = req.body;

    if (!itemCode || !locationCode || typeof quantity !== 'number') {
      return res.status(400).json({ error: 'itemCode, locationCode and numeric quantity are required' });
    }

    const rawUserId = authReq.user?.id || '';
    // Ensure we pass a GUID (uniqueidentifier). Some installations use numeric user ids;
    // converting int->uniqueidentifier fails. Use a placeholder GUID when not available
    // and log a warning so the issue can be addressed properly (mapping to Users2 table).
    const GUID_ZERO = '00000000-0000-0000-0000-000000000000';
    const isGuid = typeof rawUserId === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawUserId);
    const userId = isGuid ? rawUserId : GUID_ZERO;
    if (!isGuid) {
      console.warn(`Warning: user id '${rawUserId}' is not a GUID. Using placeholder ${GUID_ZERO} for STOCK.USER_ID.`);
    }

    const result = await db.addStockEntry({ warehouseCode: warehouseCode || authReq.user.warehouse, itemCode, locationCode, quantity, userId });

    const stockId = result && (result as any).STOCK_ID ? (result as any).STOCK_ID : null;
    res.json({ message: 'Stock entry created', stockId });
  } catch (error) {
    console.error('Create stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settings
app.get('/api/settings', authenticateToken, requireRole(['admin']), async (req: express.Request, res: express.Response) => {
  try {
    const settings = await db.getSettings();
    res.json({ settings, total: settings.length });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/settings', authenticateToken, requireRole(['admin']), async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { settings } = authReq.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array required' });
    }

    // Update each setting
    await Promise.all(
      settings.map(setting => 
        db.updateSetting(setting.id, setting.value, authReq.user.id)
      )
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/settings/:name', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { name } = req.params;
    const setting = await db.getSettingByName(name);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'REAL SERVER'
  });
});

// Debug endpoints disabled for production
// app.get('/api/debug/users', async (req: express.Request, res: express.Response) => {
//   try {
//     const users = await db.getUsers() as User[];
//     res.json({ 
//       message: 'REAL SERVER - Database connection OK', 
//       userCount: users.length,
//       users: users.map(u => ({ email: u.email, role: u.role }))
//     });
//   } catch (error) {
//     if (error instanceof Error) {
//       res.status(500).json({ error: 'Database connection failed', details: error.message });
//     } else {
//       res.status(500).json({ error: 'Database connection failed', details: 'Unknown error' });
//     }
//   }
// });

// app.post('/api/debug/test-password', async (req: express.Request, res: express.Response) => {
//   try {
//     const { email, password } = req.body;
//     const user = await db.getUserByEmail(email) as User;
//     
//     if (!user) {
//       return res.json({ found: false, message: 'User not found' });
//     }
//     
//     const isValid = user.passwordHash? await bcrypt.compare(password, user.passwordHash): false;
//     res.json({ 
//       found: true, 
//       passwordValid: isValid,
//       email: user.email,
//       role: user.role,
//       server: 'REAL SERVER'
//     });
//   } catch (error) {
//     if (error instanceof Error) {
//       res.status(500).json({ error: 'DUMMY SERVER error', details: error.message });
//     } else {
//       res.status(500).json({ error: 'DUMMY SERVER error', details: 'Unknown error' });
//     }
//   }
// });


app.get('/api/warehouses', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const warehouses = await db.getWarehouses() as Warehouse[];

    res.json({ warehouses, total: warehouses.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup expired 2FA codes every hour
setInterval(async () => {
  try {
    await db.cleanup2FACodes();
  } catch (error) {
    // Error handled silently
  }
}, 60 * 60 * 1000);

// Serve index.html per tutte le route non-API (SPA support)
import path from "path";
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  } else {
    next();
  }
});



app.listen(PORT, () => {
  console.log(`🚀 REAL SERVER running on port ${PORT}`);
});