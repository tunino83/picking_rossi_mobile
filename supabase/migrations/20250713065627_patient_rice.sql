/*
  # Crea Utente di Test - ROSSI Portal
  
  Script per creare un utente di test con password semplice per verificare il login.
*/

-- Crea utente di test con password "test123"
-- Hash per "test123": $2a$10$N9qo8uLOickgx2ZMRZoMye.IBA9YtNQZeZmIrq6OvuJmhDiYar7C6

INSERT INTO Users (email, FIRST_NAME, LAST_NAME, name, role, passwordHash) 
VALUES (
    'test@rossi.com', 
    'Test', 
    'User', 
    'Test User', 
    'admin', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IBA9YtNQZeZmIrq6OvuJmhDiYar7C6'
);

PRINT 'Utente di test creato:';
PRINT '  Email: test@rossi.com';
PRINT '  Password: test123';
PRINT '  Ruolo: admin';

-- Verifica creazione
SELECT email, name, role FROM Users WHERE email = 'test@rossi.com';