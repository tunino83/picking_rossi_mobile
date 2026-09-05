import sql from 'mssql';
import dotenv from 'dotenv';
import { Order, OrderRow ,Warehouse} from '../types';
dotenv.config();

// Configurazione del database

const dbConfig: sql.config = {
  
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ,
  server: process.env.DB_SERVER! ,
  port: 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

/*
const dbConfig: sql.config = {
  server: 'localhost',      // senza \SQLEXPRESS
  database: 'SUPPORT',
  options: {
    instanceName: 'SQLEXPRESS',  // specifica l'istanza qui
    encrypt: false,
    trustServerCertificate: true
  },
  authentication: {
    type: 'ntlm',  // o 'ntlm' per autenticazione windows
    options: {
      userName: '',  // o '' se autenticazione windows integrata
      password: '',
      domain: ''  // se usi dominio, mettilo qui
    }
  }
};
*/
// Pool di connessione
let pool: sql.ConnectionPool | null = null;

// Inizializza la connessione al database
export async function initializeDb() {
  console.error(dbConfig);
  try {
    if (pool) {
      return pool;
    }
    
    pool = await new sql.ConnectionPool(dbConfig).connect();
    return pool;
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}

// Ottieni una connessione dal pool
export async function getConnection() {
  if (!pool) {
    await initializeDb();
  }
  return pool!;
}

// Query helper con parametri tipizzati
export async function executeQuery<T>(query: string, params: Record<string, any> = {}): Promise<T[]> {
  try {
    const conn = await getConnection();
    const request = conn.request();
    
    // Aggiungi i parametri alla query
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('Query execution failed:', err);
    throw err;
  }
}

// Stored procedure helper
export async function executeStoredProcedure<T>(
  procedureName: string, 
  params: Record<string, any> = {}
): Promise<T[]> {
  try {
    const conn = await getConnection();
    const request = conn.request();
    
    // Aggiungi i parametri
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.execute(procedureName);
    return result.recordset;
  } catch (err) {
    console.error('Stored procedure execution failed:', err);
    throw err;
  }
}

// Funzioni per le operazioni CRUD

// Users
export async function getUsers(filtersObj: any = {}) {

  const conditions: string[] = [];
  const params: Record<string, any> = {};
  if (filtersObj.warehouse) {
    conditions.push('AND u.WAREHOUSE_CODE = @warehouse');
    params.warehouse = filtersObj.warehouse;
  }
  if (filtersObj.role) {
    conditions.push('AND u.role = @role');
    params.role = filtersObj.role;
  }


  return executeQuery(`
    SELECT 
      u.id,
      u.email,
      u.FIRST_NAME,
      u.LAST_NAME,
      u.NAME,
      u.role,
      u.createdAt,
      u.twoFactorEnabled,
      u.WAREHOUSE_CODE
    FROM Users u
    WHERE 1=1 ${conditions.join(' ')}
    ORDER BY u.name
  `, params);
}

export async function getUserById(id: string) {
  const users = await executeQuery(`
    SELECT 
      u.id,
      u.email,
      u.FIRST_NAME,
      u.LAST_NAME,
      u.NAME,
      u.role,
      u.createdAt,
      u.twoFactorEnabled,
      u.WAREHOUSE_CODE
    FROM Users u
    WHERE u.id = @id
  `, { id });
  
  return users[0] || null;
}

export async function createUser(userData: {email:string,
      FIRST_NAME:string,
      LAST_NAME:string,
      role:string,
      passwordHash:string,
      WAREHOUSE_CODE?:string,
    NAME?:string}) {

      userData.NAME = `${userData.FIRST_NAME} ${userData.LAST_NAME}`;
    
  await executeQuery(`
    INSERT INTO [SUPPORT].[dbo].USERS (email, FIRST_NAME, LAST_NAME, NAME, role, passwordHash, WAREHOUSE_CODE)
    VALUES (@Email, @FIRST_NAME, @LAST_NAME, @Name, @Role, @PasswordHash, @WAREHOUSE_CODE)
  `, userData);
}


export async function logAccess(userId:number, email:string, ipAddress:string, userAgent:string, success:boolean, message:string) {
  await executeQuery(`
    INSERT INTO [SUPPORT].[dbo].ACCESS_LOG (USERID, EMAIL, IP_ADDRESS, USER_AGENT, SUCCESS, MESSAGE)
    VALUES (@userId, @Email, @IpAddress, @UserAgent, @Success, @Message)
  `, { userId, email, ipAddress, userAgent, success, message });
}


export async function getUserByEmail(email: string) {
  const users = await executeQuery(`
    SELECT 
      u.id,
      u.email,
      u.FIRST_NAME,
      u.LAST_NAME,
      u.NAME,
      u.role,
      u.passwordHash,
      u.twoFactorEnabled,
      u.enabled,
      u.createdAt,
      u.WAREHOUSE_CODE,
      w.name AS WAREHOUSE_NAME,
      w.country AS WAREHOUSE_COUNTRY
    FROM Users u LEFT OUTER JOIN WAREHOUSES w ON  u.WAREHOUSE_CODE = w.code
    WHERE u.email = @email
  `, { email });
  
  return users[0] || null;
}


// Orders
interface OrderFilter {
  assignedTo?: string;
  id?: string;
  // altri campi futuri, ad esempio:
  listTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  warehouse?: string;
  // ecc.
}

export async function getOrders(filters: OrderFilter = {}) {

  const conditions: string[] = [];
  const params: Record<string, any> = {};
  
  if (filters.warehouse) {
    conditions.push('h.WAREHOUSE_CODE = @warehouse');
    params.warehouse = filters.warehouse;
  }

  if (filters.assignedTo) {
    conditions.push('b.ASSIGNED_USER_ID = @assignedTo');
    params.assignedTo = filters.assignedTo;
  }

  if (filters.id) {
    conditions.push('h.LIST_HEADER_ID = @id');
    params.id = filters.id;
  }
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  return executeQuery(`
    SELECT TOP (1000)  h.[LIST_HEADER_ID]
      ,h.[LIST_TYPE_ID]
      ,h.[LIST_TYPE_DESCRIPTION]
      ,h.[LIST_SUBTYPE_ID]
      ,h.[LIST_SUBTYPE_DESCRIPTION]
      ,h.[LIST_DATE]
      ,COUNT( CASE WHEN b.ASSIGNED_USER_ID is not null THEN b.ASSIGNED_USER_ID END) AS COUNT_ASSIGNED
      ,COUNT( CASE WHEN b.ASSIGNED_USER_ID is  null or b.ASSIGNED_USER_ID = 0 THEN 1 END) AS COUNT_UNASSIGNED
      ,h.[PORTAL_NOTE]
      ,CASE 
        WHEN EXISTS (
            SELECT 1 FROM [dbo].[TRANSACTION_LOG] t
            WHERE t.LIST_HEADER_ID = h.LIST_HEADER_ID AND t.TRANSACTION_TYPE = 6
        ) THEN 'COMPLETED'
        WHEN EXISTS (
            SELECT 1 FROM [dbo].[TRANSACTION_LOG] t
            WHERE t.LIST_HEADER_ID = h.LIST_HEADER_ID AND t.TRANSACTION_TYPE IN (1, 5)
        ) THEN 'IN PROGRESS'
        ELSE 'NOT STARTED'
    END AS STATUS,
    -- Numero totale di BODY record associati
    COUNT(DISTINCT b.LIST_BODY_ID) AS ROWS_COUNT,
    -- Numero di BODY record con TRANSACTION_TYPE = 5
    COUNT(DISTINCT CASE WHEN t.TRANSACTION_TYPE = 5 THEN b.LIST_BODY_ID END) AS ROWS_IN_5,
    COUNT(DISTINCT CASE WHEN t.TRANSACTION_TYPE = 1 THEN b.LIST_BODY_ID END) AS ROWS_IN_1
  FROM [SUPPORT].[dbo].[LIST_HEADER] h
  LEFT JOIN 
    [dbo].[LIST_BODY] b ON b.LIST_HEADER_ID = h.LIST_HEADER_ID
  LEFT JOIN 
    [dbo].[USERS] u ON u.id = b.ASSIGNED_USER_ID 
  LEFT JOIN 
    [dbo].[TRANSACTION_LOG] t ON t.LIST_HEADER_ID = h.LIST_HEADER_ID AND t.LIST_BODY_ID = b.LIST_BODY_ID
  ${whereClause}
  GROUP BY 
   h.[LIST_HEADER_ID]
      ,h.[LIST_TYPE_ID]
      ,h.[LIST_TYPE_DESCRIPTION]
      ,h.[LIST_SUBTYPE_ID]
      ,h.[LIST_SUBTYPE_DESCRIPTION]
      ,h.[LIST_DATE]
      ,h.[PORTAL_NOTE]
      ,h.[WAREHOUSE_CODE]
    ORDER BY [LIST_HEADER_ID] DESC

  `, params);
}

// Stock
export async function getStock(warehouseCode?: string, limit: number = 25, offset: number = 0) {
  const conditions: string[] = [];
  const params: Record<string, any> = {};

  if (warehouseCode) {
    conditions.push('AND WAREHOUSE_CODE = @warehouseCode');
    params.warehouseCode = warehouseCode;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' ') : '';

  // Get total count
  const countResult = await executeQuery(`
    SELECT COUNT(*) AS TOTAL
    FROM STOCK
    ${whereClause}
  `, params);

  const total = (countResult && countResult[0] && (countResult[0] as any).TOTAL) ? Number((countResult[0] as any).TOTAL) : 0;

  // Fetch paginated rows
  const rows = await executeQuery(`
    SELECT
      STOCK_ID,
      WAREHOUSE_CODE,
      ITEM_CODE,
      LOCATION_CODE,
      QUANTITY,
      STOCK_CHECK_DATE,
      USER_ID,
      CUSTOM_FIELD_1,
      CUSTOM_FIELD_2
    FROM STOCK
    ${whereClause}
    ORDER BY STOCK_CHECK_DATE DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `, { ...params, offset, limit });

  return { rows, total };
}

export async function addStockEntry(data: { warehouseCode: string; itemCode: string; locationCode: string; quantity: number; userId: string }) {
  const query = `
    INSERT INTO STOCK (WAREHOUSE_CODE, ITEM_CODE, LOCATION_CODE, QUANTITY, STOCK_CHECK_DATE, USER_ID, CUSTOM_FIELD_1, CUSTOM_FIELD_2)
    VALUES (@warehouseCode, @itemCode, @locationCode, @quantity, CURRENT_TIMESTAMP, @userId, 0, '');
    SELECT SCOPE_IDENTITY() AS STOCK_ID;
  `;

  const result = await executeQuery(query, {
    warehouseCode: data.warehouseCode,
    itemCode: data.itemCode,
    locationCode: data.locationCode,
    quantity: data.quantity,
    userId: data.userId,
  });

  return result[0] || null;
}

export async function getOrderById(id: string) {
  let order =  await getOrders({id:id}) as Order[] || null;
  if(order !== null ){
    let rows = await getOrderRows(parseInt(id),null) as OrderRow[] || [];
    order[0].ROWS = rows;
    return order[0];
  } else return null
}

export async function assignOrder(orderId: string, userId: string) {
  return executeQuery(`
    UPDATE [SUPPORT].[dbo].[LIST_HEADER]
    SET ASSIGNED_USER_ID = @userId, PORTAL_NOTE = 'Assigned to user {userId} on {new Date().toISOString()}'
    WHERE LIST_HEADER_ID = @orderId
  `, { orderId, userId });
}

export async function assignOrderRows(rowIds: number[], userId: string) {
  return executeQuery(`
    UPDATE [SUPPORT].[dbo].[LIST_BODY]
    SET ASSIGNED_USER_ID = @userId
    WHERE LIST_BODY_ID IN (${rowIds.join(',')})
  `, { userId });
}


export async function addTransactionLog(type: string,orderData: {
    headerId: number;
    bodyId?: number;
    quantity?:number;
    userEmail: string;
  }) {
    
    if(type === 'CLOSE_HEADER'){
        const query = `
    INSERT INTO [SUPPORT].[dbo].[TRANSACTION_LOG] (
       [TRANSACTION_TIMESTAMP],[PROCESSING_TIMESTAMP]
      ,[PROCESSING_STATUS_CODE],[LIST_BODY_ID],[TRANSACTION_TYPE],[TRANSACTION_QUANTITY]
      ,[LIST_HEADER_ID]
      ,[LIST_TYPE_ID]
      ,[DEVICE_CODE]
      ,[USER_NAME]
      ,[CUSTOM_FIELD_1]
      ,[CUSTOM_FIELD_2]
      ,ITEM_CODE,ITEM_BATCH_CODE,ITEM_SERIAL_NUMBER,WAREHOUSE_CODE,LOCATION_CODE_TO
      )
      SELECT 
      CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,
      1,0,6,0,
      LIST_HEADER_ID,LIST_TYPE_ID,
      @deviceCode,@userEmail,0,@customField2,
      '','','','',''
      FROM LIST_HEADER lh
      WHERE lh.LIST_HEADER_ID = @listHeaderId
        `;
        const closeHeaderResult = await executeQuery(query, {
          deviceCode: 'web',
          userEmail: orderData.userEmail || 'system',
          customField2: 'Chiusura ordine testata '+ orderData.headerId,
          listHeaderId: orderData.headerId
         });
        // Pulizia: una volta chiuso davvero l'ordine, le conferme checkbox non servono piu'
        await executeQuery(`
          DELETE FROM [SUPPORT].[dbo].[ROW_CONFIRMATIONS]
          WHERE LIST_BODY_ID IN (
            SELECT LIST_BODY_ID FROM [SUPPORT].[dbo].[LIST_BODY] WHERE LIST_HEADER_ID = @listHeaderId
          )
        `, { listHeaderId: orderData.headerId });
        return closeHeaderResult;
    } else if(type === 'CLOSE_BODY'){
      const query = `
      INSERT INTO [SUPPORT].[dbo].[TRANSACTION_LOG] (
       [TRANSACTION_TIMESTAMP],[PROCESSING_TIMESTAMP]
      ,[PROCESSING_STATUS_CODE],[TRANSACTION_TYPE],[TRANSACTION_QUANTITY]
      ,[LIST_HEADER_ID]
      ,[LIST_BODY_ID]
      ,[LIST_TYPE_ID]
      ,[DEVICE_CODE]
      ,[USER_NAME]
      ,[CUSTOM_FIELD_1]
      ,[CUSTOM_FIELD_2]
      ,ITEM_CODE,ITEM_BATCH_CODE,ITEM_SERIAL_NUMBER,WAREHOUSE_CODE,LOCATION_CODE_TO
      )
      SELECT 
      CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,
      1,5,0,
      LIST_HEADER_ID,LIST_BODY_ID,LIST_TYPE_ID,
      @deviceCode,@userEmail,0,@customField2,
      '','','','',''
      FROM LIST_BODY lb
      WHERE lb.LIST_HEADER_ID = @listHeaderId and lb.LIST_BODY_ID = @listBodyId
        `;
      let  response = executeQuery(query, { 
          deviceCode: 'web',
          userEmail: orderData.userEmail || 'system',
          customField2: 'Chiusura ordine riga '+ orderData.bodyId + ' testata '+ orderData.headerId,
          listHeaderId: orderData.headerId,
          listBodyId: orderData.bodyId
         });

      return response;   

    } else if(type === 'ADD_TRANSACTION'){
      const query = `
      INSERT INTO [SUPPORT].[dbo].[TRANSACTION_LOG] (
       [TRANSACTION_TIMESTAMP],[PROCESSING_TIMESTAMP]
      ,[PROCESSING_STATUS_CODE],[TRANSACTION_TYPE]
      ,[TRANSACTION_QUANTITY]
      ,[LIST_HEADER_ID]
      ,[LIST_BODY_ID]
      ,[LIST_TYPE_ID]
      ,[DEVICE_CODE]
      ,[USER_NAME]
      ,[CUSTOM_FIELD_1]
      ,[CUSTOM_FIELD_2]
      ,ITEM_CODE,ITEM_BATCH_CODE,ITEM_SERIAL_NUMBER,WAREHOUSE_CODE,LOCATION_CODE_TO
      )
      SELECT 
      CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      ,1,1
      ,@transactionQuantity
      ,LIST_HEADER_ID,LIST_BODY_ID,LIST_TYPE_ID
      ,@deviceCode,@userEmail,0,@customField2
      ,ITEM_CODE,ITEM_BATCH_CODE,'',WAREHOUSE_CODE,LOCATION_CODE_TO
      FROM LIST_BODY lb
      WHERE lb.LIST_HEADER_ID = @listHeaderId and lb.LIST_BODY_ID = @listBodyId
        `;
      let  response = executeQuery(query, { 
          deviceCode: 'web',
          userEmail: orderData.userEmail || 'system',
          customField2: 'Prelevati '+ orderData.quantity+ ' pezzi',
          listHeaderId: orderData.headerId,
          listBodyId: orderData.bodyId,
          transactionQuantity: orderData.quantity || 0
         });

      return response;   

    }

}


// Order Products
export async function getOrderRows(LIST_HEADER_ID: number,filtersObj: any = {}) {

  const conditions: string[] = [];
  const params: Record<string, any> = {};
  params.LIST_HEADER_ID = LIST_HEADER_ID;
  if (filtersObj.assignedTo) {
    conditions.push('AND b.ASSIGNED_USER_ID = @assignedTo');
    params.assignedTo = filtersObj.assignedTo;
  }
  const whereClause =  conditions.join(' AND ') ;

  
  return executeQuery(`
    WITH LanguageSetting AS (
    SELECT [value] AS LanguageCode
    FROM [dbo].[SETTINGS]\
    WHERE [name] = 'Language'
)
    SELECT TOP (1000) b.[LIST_BODY_ID]
      ,b.[LIST_HEADER_ID]
      ,b.[LIST_TYPE_ID]
      ,[FLG_READONLY_TRANSACTION]
      ,b.[WAREHOUSE_CODE]
      ,[WAREHOUSE_NAME]
      ,[LOCATION_CODE_FROM]
      ,b.[LOCATION_CODE_TO]
      ,b.[ITEM_CODE]
      ,[ITEM_SHORT_CODE]
      ,[ITEM_DEFAULT_DESCRIPTION]
      ,[ITEM_LOCALE_DESCRIPTION_IT]
      ,[ITEM_LOCALE_DESCRIPTION_EN]
      ,b.[ITEM_BATCH_CODE]
      ,[MEASURE_UNIT_CODE]
      ,[MEASURE_UNIT_DEFAULT_DEESCRIPTION]
      ,[MEASURE_UNIT_LOCALE_DESCRIPTION_IT]
      ,[MEASURE_UNIT_LOCALE_DESCRIPTION_EN]
      ,[WEIGHT]
      ,[WEIGHT_MEASURE_UNIT_CODE]
      ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE]
      ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE]
      ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_NUMBER]
      ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_LINE_NUMBER]
      ,[KANBAN_CODE]
      ,[TRANSFER_DOCUMENT_TYPE]
      ,[TRANSFER_DOCUMENT_ORDER_NUMBER]
      ,[ASSEMBLY_PROGRAM_NUMBER]
      ,[DELIVERY_TERMS_CODE]
      ,[DELIVERY_TERMS_DEFAULT_DESCRIPTION]
      ,[DELIVERY_TERMS_LOCALE_DESCRIPTION_IT]
      ,[DELIVERY_TERMS_LOCALE_DESCRIPTION_EN]
      ,[DELIVERY_INSTRUCTIONS]
      ,[CUSTOMER_OR_SUPPLIER_CODE]
      ,[CUSTOMER_OR_SUPPLIER_NAME]
      ,[SHIPPING_LOCATION_CODE]
      ,[SHIPPING_LOCATION_NAME]
      ,CASE 
        WHEN ls.LanguageCode = 'EN'
        THEN COALESCE([ITEM_LOCALE_DESCRIPTION_EN], [ITEM_DEFAULT_DESCRIPTION])
        ELSE COALESCE([ITEM_LOCALE_DESCRIPTION_IT], [ITEM_DEFAULT_DESCRIPTION])
    END AS ITEM_DESCRIPTION
    ,CASE 
        WHEN ls.LanguageCode = 'EN'
        THEN COALESCE([MEASURE_UNIT_LOCALE_DESCRIPTION_EN], [MEASURE_UNIT_DEFAULT_DEESCRIPTION])
        ELSE COALESCE([MEASURE_UNIT_LOCALE_DESCRIPTION_IT], [MEASURE_UNIT_DEFAULT_DEESCRIPTION])
    END AS MEASURE_UNIT_DESCRIPTION
    ,CASE 
        WHEN ls.LanguageCode = 'EN'
        THEN COALESCE([DELIVERY_TERMS_LOCALE_DESCRIPTION_EN], [DELIVERY_TERMS_DEFAULT_DESCRIPTION])
        ELSE COALESCE([DELIVERY_TERMS_LOCALE_DESCRIPTION_IT], [DELIVERY_TERMS_DEFAULT_DESCRIPTION])
       END AS DELIVERY_TERMS_DESCRIPTION
      ,CASE 
        WHEN EXISTS (
            SELECT 1 FROM [dbo].[TRANSACTION_LOG] t
            WHERE t.LIST_HEADER_ID = b.LIST_HEADER_ID AND t.LIST_BODY_ID = b.LIST_BODY_ID AND t.TRANSACTION_TYPE = 5
        ) THEN 'COMPLETED'
        WHEN EXISTS (
            SELECT 1 FROM [dbo].[TRANSACTION_LOG] t
            WHERE t.LIST_HEADER_ID = b.LIST_HEADER_ID  AND t.LIST_BODY_ID = b.LIST_BODY_ID AND t.TRANSACTION_TYPE  = 1
        ) THEN 'IN PROGRESS'
        ELSE 'NOT STARTED'
  END AS STATUS
  ,[QUANTITY]
  ,COALESCE(SUM(t.TRANSACTION_QUANTITY), 0) AS WORKED_QUANTITY
  ,b.[ASSIGNED_USER_ID] as ASSIGNED_USER_ID
  ,CASE 
    WHEN u.FIRST_NAME IS NOT NULL AND u.LAST_NAME IS NOT NULL 
      THEN CONCAT(u.FIRST_NAME, ' ', u.LAST_NAME)
    ELSE NULL
  END as ASSIGNED_TO
   FROM 
  [SUPPORT].[dbo].[LIST_BODY] b 
  LEFT JOIN 
    [dbo].[TRANSACTION_LOG] t ON t.LIST_HEADER_ID = b.LIST_HEADER_ID AND t.LIST_BODY_ID = b.LIST_BODY_ID
  CROSS JOIN
    LanguageSetting ls
  LEFT JOIN [dbo].[USERS] u ON b.ASSIGNED_USER_ID = u.id
  WHERE b.LIST_HEADER_ID = @LIST_HEADER_ID ${whereClause}
  GROUP BY
    b.[LIST_BODY_ID]
  ,b.[ASSIGNED_USER_ID] 
   ,b.[LIST_HEADER_ID]
   ,b.[LIST_TYPE_ID]
   ,[FLG_READONLY_TRANSACTION]
   ,b.[WAREHOUSE_CODE]
   ,[WAREHOUSE_NAME]
   ,[LOCATION_CODE_FROM]
   ,b.[LOCATION_CODE_TO]
   ,b.[ITEM_CODE]
   ,[ITEM_SHORT_CODE]
   ,[ITEM_DEFAULT_DESCRIPTION]
   ,[ITEM_LOCALE_DESCRIPTION_IT]
   ,[ITEM_LOCALE_DESCRIPTION_EN]
   ,b.[ITEM_BATCH_CODE]
   ,[QUANTITY]
   ,[MEASURE_UNIT_CODE]
   ,[MEASURE_UNIT_DEFAULT_DEESCRIPTION]
   ,[MEASURE_UNIT_LOCALE_DESCRIPTION_IT]
   ,[MEASURE_UNIT_LOCALE_DESCRIPTION_EN]
   ,[WEIGHT]
   ,[WEIGHT_MEASURE_UNIT_CODE]
   ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_COMPANY_CODE]
   ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_TYPE]
   ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_NUMBER]
   ,[PURCHASE_OR_SALES_OR_ASSEMBLY_ORDER_LINE_NUMBER]
   ,[KANBAN_CODE]
   ,[TRANSFER_DOCUMENT_TYPE]
   ,[TRANSFER_DOCUMENT_ORDER_NUMBER]
   ,[ASSEMBLY_PROGRAM_NUMBER]
   ,[DELIVERY_TERMS_CODE]
   ,[DELIVERY_TERMS_DEFAULT_DESCRIPTION]
   ,[DELIVERY_TERMS_LOCALE_DESCRIPTION_IT]
   ,[DELIVERY_TERMS_LOCALE_DESCRIPTION_EN]
   ,[DELIVERY_INSTRUCTIONS]
   ,[CUSTOMER_OR_SUPPLIER_CODE]
   ,[CUSTOMER_OR_SUPPLIER_NAME]
   ,[SHIPPING_LOCATION_CODE]
   ,[SHIPPING_LOCATION_NAME]
   ,ls.LanguageCode
   ,u.LAST_NAME
   ,u.FIRST_NAME
    ORDER BY [LIST_BODY_ID] DESC

  `, params);
}

export async function updateProductStatus(orderId: string, productId: string, status: string) {
  return executeQuery(`
    UPDATE OrderProducts 
    SET status = @status
    WHERE orderId = @orderId AND productId = @productId
  `, { orderId, productId, status });
}

// Settings
export async function getSettings() {
  return executeQuery(`
    SELECT 
      s.id,
      s.name,
      s.description,
      s.value,
      s.updatedAt,
      s.updatedBy,
      u.name as updatedByName
    FROM Settings s
    LEFT JOIN Users u ON s.updatedBy = u.id
    ORDER BY s.name
  `);
}

export async function getSettingByName(name: string) {
  const settings = await executeQuery(`
    SELECT 
      s.id,
      s.name,
      s.description,
      s.value,
      s.updatedAt,
      s.updatedBy
    FROM Settings s
    WHERE s.name = @name
  `, { name });
  
  return settings[0] || null;
}

export async function updateSetting(id: string, value: string, updatedBy: string) {
  return executeQuery(`
    UPDATE Settings 
    SET value = @value, updatedAt = GETDATE(), updatedBy = @updatedBy
    WHERE id = @id
  `, { id, value, updatedBy });
}

// 2FA
export async function store2FACode(email: string, code: string) {
  return executeQuery(`
    MERGE TwoFactorCodes AS target
    USING (SELECT @email as email, @code as code, DATEADD(MINUTE, 10, GETDATE()) as expiresAt) AS source
    ON target.email = source.email
    WHEN MATCHED THEN
      UPDATE SET code = source.code, expiresAt = source.expiresAt, createdAt = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (email, code, expiresAt, createdAt)
      VALUES (source.email, source.code, source.expiresAt, GETDATE());
  `, { email, code });
}

export async function verify2FACode(email: string, code: string) {
  const codes = await executeQuery(`
    SELECT id, email, code, expiresAt
    FROM TwoFactorCodes
    WHERE email = @email AND code = @code AND expiresAt > GETDATE()
  `, { email, code });
  
  if (codes.length > 0) {
    // Rimuovi il codice dopo la verifica
    await executeQuery(`
      DELETE FROM TwoFactorCodes WHERE email = @email
    `, { email });
    
    return true;
  }
  
  return false;
}

// Cleanup expired 2FA codes
export async function cleanup2FACodes() {
  return executeQuery(`
    DELETE FROM TwoFactorCodes WHERE expiresAt < GETDATE()
  `);
}

// Conferme righe (checkbox) nella pagina di chiusura ordini, persistite per utente
export async function getConfirmedRows(userId: string): Promise<number[]> {
  const rows = await executeQuery<{ LIST_BODY_ID: number }>(`
    SELECT LIST_BODY_ID FROM [SUPPORT].[dbo].[ROW_CONFIRMATIONS] WHERE USER_ID = @userId
  `, { userId });
  return rows.map((r) => r.LIST_BODY_ID);
}

export async function setRowConfirmed(userId: string, bodyId: number, confirmed: boolean) {
  if (confirmed) {
    await executeQuery(`
      MERGE [SUPPORT].[dbo].[ROW_CONFIRMATIONS] AS target
      USING (SELECT @bodyId AS LIST_BODY_ID, @userId AS USER_ID) AS source
      ON target.LIST_BODY_ID = source.LIST_BODY_ID AND target.USER_ID = source.USER_ID
      WHEN NOT MATCHED THEN
        INSERT (LIST_BODY_ID, USER_ID, CONFIRMED_AT) VALUES (source.LIST_BODY_ID, source.USER_ID, GETDATE());
    `, { bodyId, userId });
  } else {
    await executeQuery(`
      DELETE FROM [SUPPORT].[dbo].[ROW_CONFIRMATIONS] WHERE LIST_BODY_ID = @bodyId AND USER_ID = @userId
    `, { bodyId, userId });
  }
}

export function getWarehouses(): Warehouse[] | PromiseLike<Warehouse[]> {
  return executeQuery(`
    SELECT 
      w.name,
      w.code,
      w.country
    FROM [SUPPORT].[dbo].[WAREHOUSES] w
    ORDER BY w.name
  `);
}
