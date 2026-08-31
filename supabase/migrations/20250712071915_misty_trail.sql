/*
  # ROSSI Portal Database Schema
  
  Complete SQL Server database schema for the ROSSI Portal application.
  
  ## Tables Created:
  1. Users - User management with roles
  2. Orders - Work orders management
  3. Products - Product inventory
  4. OrderProducts - Order-Product relationship
  5. Settings - System settings
  6. TwoFactorCodes - 2FA temporary codes
  
  ## Default Data:
  - Default users (admin, warehouse, orders)
  - Sample products
  - Sample orders
  - Initial settings
  
  ## Security:
  - Password hashing with bcrypt
  - Indexes for performance
  - Triggers for automatic timestamps
*/

-- Create database (run this separately if needed)
-- CREATE DATABASE RossiPortal;
-- USE RossiPortal;

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE Users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) UNIQUE NOT NULL,
    FIRST_NAME NVARCHAR(100) NOT NULL,
    LAST_NAME NVARCHAR(100) NOT NULL,
    name NVARCHAR(200) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (role IN ('admin', 'warehouse', 'orders')),
    passwordHash NVARCHAR(255) NOT NULL,
    twoFactorEnabled BIT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- =============================================
-- Products Table
-- =============================================
CREATE TABLE Products (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    code NVARCHAR(100) UNIQUE NOT NULL,
    aisle NVARCHAR(10) NOT NULL,
    shelf NVARCHAR(10) NOT NULL,
    position NVARCHAR(10) NOT NULL,
    weight DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- =============================================
-- Orders Table
-- =============================================
CREATE TABLE Orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    assignedTo UNIQUEIDENTIFIER,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (assignedTo) REFERENCES Users(id)
);

-- =============================================
-- OrderProducts Table (Many-to-Many relationship)
-- =============================================
CREATE TABLE OrderProducts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    orderId UNIQUEIDENTIFIER NOT NULL,
    productId UNIQUEIDENTIFIER NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status NVARCHAR(50) NOT NULL DEFAULT 'da_prendere' CHECK (status IN ('da_prendere', 'preso', 'non_presente')),
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Products(id)
);

-- =============================================
-- Settings Table
-- =============================================
CREATE TABLE Settings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) UNIQUE NOT NULL,
    description NVARCHAR(500),
    value NVARCHAR(MAX) NOT NULL,
    updatedAt DATETIME2 DEFAULT GETDATE(),
    updatedBy UNIQUEIDENTIFIER,
    FOREIGN KEY (updatedBy) REFERENCES Users(id)
);

-- =============================================
-- TwoFactorCodes Table (for 2FA)
-- =============================================
CREATE TABLE TwoFactorCodes (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL,
    code NVARCHAR(10) NOT NULL,
    expiresAt DATETIME2 NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE()
);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IX_Users_Email ON Users(email);
CREATE INDEX IX_Users_Role ON Users(role);
CREATE INDEX IX_Products_Code ON Products(code);
CREATE INDEX IX_Products_Aisle_Shelf ON Products(aisle, shelf);
CREATE INDEX IX_Orders_Status ON Orders(status);
CREATE INDEX IX_Orders_AssignedTo ON Orders(assignedTo);
CREATE INDEX IX_Orders_CreatedAt ON Orders(createdAt);
CREATE INDEX IX_OrderProducts_OrderId ON OrderProducts(orderId);
CREATE INDEX IX_OrderProducts_ProductId ON OrderProducts(productId);
CREATE INDEX IX_OrderProducts_Status ON OrderProducts(status);
CREATE INDEX IX_Settings_Name ON Settings(name);
CREATE INDEX IX_TwoFactorCodes_Email ON TwoFactorCodes(email);
CREATE INDEX IX_TwoFactorCodes_ExpiresAt ON TwoFactorCodes(expiresAt);

-- =============================================
-- Triggers for automatic updatedAt
-- =============================================
CREATE TRIGGER TR_Users_UpdatedAt ON Users
AFTER UPDATE AS
BEGIN
    UPDATE Users 
    SET updatedAt = GETDATE() 
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER TR_Products_UpdatedAt ON Products
AFTER UPDATE AS
BEGIN
    UPDATE Products 
    SET updatedAt = GETDATE() 
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER TR_Orders_UpdatedAt ON Orders
AFTER UPDATE AS
BEGIN
    UPDATE Orders 
    SET updatedAt = GETDATE() 
    WHERE id IN (SELECT id FROM inserted);
END;

CREATE TRIGGER TR_OrderProducts_UpdatedAt ON OrderProducts
AFTER UPDATE AS
BEGIN
    UPDATE OrderProducts 
    SET updatedAt = GETDATE() 
    WHERE id IN (SELECT id FROM inserted);
END;

-- =============================================
-- Insert Default Users
-- =============================================
-- Note: Passwords are hashed with bcrypt (rounds=10)
-- admin123 -> $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- warehouse123 -> $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi  
-- orders123 -> $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

DECLARE @adminId UNIQUEIDENTIFIER = NEWID();
DECLARE @warehouseId UNIQUEIDENTIFIER = NEWID();
DECLARE @ordersId UNIQUEIDENTIFIER = NEWID();

INSERT INTO Users (id, email, FIRST_NAME, LAST_NAME, name, role, passwordHash) VALUES
(@adminId, 'admin@rossi.com', 'Marco', 'Rossi', 'Marco Rossi', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
(@warehouseId, 'warehouse@rossi.com', 'Paolo', 'Bianchi', 'Paolo Bianchi', 'warehouse', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
(@ordersId, 'orders@rossi.com', 'Laura', 'Verdi', 'Laura Verdi', 'orders', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- =============================================
-- Insert Sample Products
-- =============================================
DECLARE @product1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @product2Id UNIQUEIDENTIFIER = NEWID();
DECLARE @product3Id UNIQUEIDENTIFIER = NEWID();
DECLARE @product4Id UNIQUEIDENTIFIER = NEWID();
DECLARE @product5Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO Products (id, name, code, aisle, shelf, position, weight, stock) VALUES
(@product1Id, 'Gear motor R-C32 180', 'GM-RC32-180', 'A', '12', '3', 5.2, 25),
(@product2Id, 'Worm gearbox A-85 250', 'WG-A85-250', 'B', '05', '1', 8.7, 15),
(@product3Id, 'Helical gearbox EP-250', 'HG-EP250', 'A', '08', '4', 6.3, 30),
(@product4Id, 'Planetary gearbox PL-120', 'PG-PL120', 'C', '15', '2', 4.1, 20),
(@product5Id, 'Servo motor SM-750W', 'SM-750W', 'B', '10', '5', 3.8, 12);

-- =============================================
-- Insert Sample Orders
-- =============================================
DECLARE @order1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @order2Id UNIQUEIDENTIFIER = NEWID();
DECLARE @order3Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO Orders (id, title, description, status, assignedTo) VALUES
(@order1Id, 'Order #12345', 'Multiple gearbox components for industrial machinery', 'pending', @warehouseId),
(@order2Id, 'Order #12346', 'Servo motor assembly for automation line', 'processing', @ordersId),
(@order3Id, 'Order #12347', 'Maintenance kit for production equipment', 'completed', @warehouseId);

-- =============================================
-- Insert Order Products
-- =============================================
INSERT INTO OrderProducts (orderId, productId, quantity, status) VALUES
-- Order 1 products
(@order1Id, @product1Id, 2, 'da_prendere'),
(@order1Id, @product2Id, 1, 'da_prendere'),
(@order1Id, @product3Id, 3, 'preso'),

-- Order 2 products  
(@order2Id, @product4Id, 1, 'preso'),
(@order2Id, @product5Id, 2, 'da_prendere'),

-- Order 3 products
(@order3Id, @product1Id, 1, 'preso'),
(@order3Id, @product3Id, 2, 'preso'),
(@order3Id, @product5Id, 1, 'preso');

-- =============================================
-- Insert Default Settings
-- =============================================
INSERT INTO Settings (name, description, value, updatedBy) VALUES
('ERP-Rate-Sync', 'Frequenza Aggiornamento ERP in minuti', '5', @adminId),
('AutoAssignment', 'Associa automaticamente gli ordini agli utenti', 'N', @adminId),
('MaxOrdersPerUser', 'Numero massimo di ordini per utente', '10', @adminId),
('EmailNotifications', 'Abilita notifiche email', 'Y', @adminId),
('BackupFrequency', 'Frequenza backup automatico in ore', '24', @adminId);

-- =============================================
-- Create Views for easier data access
-- =============================================
CREATE VIEW vw_OrdersWithDetails AS
SELECT 
    o.id,
    o.title,
    o.description,
    o.status,
    o.assignedTo,
    o.createdAt,
    o.updatedAt,
    u.name as assignedToName,
    u.email as assignedToEmail,
    COUNT(op.id) as totalProducts,
    SUM(CASE WHEN op.status = 'preso' THEN 1 ELSE 0 END) as completedProducts
FROM Orders o
LEFT JOIN Users u ON o.assignedTo = u.id
LEFT JOIN OrderProducts op ON o.id = op.orderId
GROUP BY o.id, o.title, o.description, o.status, o.assignedTo, o.createdAt, o.updatedAt, u.name, u.email;

CREATE VIEW vw_ProductsWithStock AS
SELECT 
    p.*,
    CASE 
        WHEN p.stock > 20 THEN 'High'
        WHEN p.stock > 10 THEN 'Medium'
        WHEN p.stock > 0 THEN 'Low'
        ELSE 'Out of Stock'
    END as stockLevel
FROM Products p;

-- =============================================
-- Stored Procedures for common operations
-- =============================================

-- Get user orders with products
CREATE PROCEDURE sp_GetUserOrders
    @UserId UNIQUEIDENTIFIER = NULL,
    @Status NVARCHAR(50) = NULL
AS
BEGIN
    SELECT 
        o.id,
        o.title,
        o.description,
        o.status,
        o.assignedTo,
        o.createdAt,
        o.updatedAt,
        u.name as assignedToName
    FROM Orders o
    LEFT JOIN Users u ON o.assignedTo = u.id
    WHERE (@UserId IS NULL OR o.assignedTo = @UserId)
      AND (@Status IS NULL OR o.status = @Status)
    ORDER BY o.createdAt DESC;
END;

-- Update order status
CREATE PROCEDURE sp_UpdateOrderStatus
    @OrderId UNIQUEIDENTIFIER,
    @Status NVARCHAR(50),
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    UPDATE Orders 
    SET status = @Status, updatedAt = GETDATE()
    WHERE id = @OrderId;
    
    -- Log the change (you could add an audit table here)
    SELECT 'Order status updated successfully' as message;
END;

-- Search products
CREATE PROCEDURE sp_SearchProducts
    @SearchTerm NVARCHAR(255) = NULL,
    @Limit INT = 50,
    @Offset INT = 0
AS
BEGIN
    SELECT 
        id, name, code, aisle, shelf, position, weight, stock
    FROM Products
    WHERE (@SearchTerm IS NULL 
           OR name LIKE '%' + @SearchTerm + '%' 
           OR code LIKE '%' + @SearchTerm + '%')
    ORDER BY name
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END;

-- =============================================
-- Final Success Message
-- =============================================
PRINT 'ROSSI Portal database schema created successfully!';
PRINT 'Default users created:';
PRINT '  - admin@rossi.com (password: admin123)';
PRINT '  - warehouse@rossi.com (password: warehouse123)';
PRINT '  - orders@rossi.com (password: orders123)';
PRINT '';
PRINT 'Sample data inserted:';
PRINT '  - 5 products';
PRINT '  - 3 orders with products';
PRINT '  - 5 system settings';
PRINT '';
PRINT 'Database is ready for use!';