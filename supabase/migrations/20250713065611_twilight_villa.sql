/*
  # Fix User Passwords - ROSSI Portal
  
  Questo script aggiorna le password degli utenti di default con hash corretti.
  
  Password in chiaro:
  - admin@rossi.com: admin123
  - warehouse@rossi.com: warehouse123  
  - orders@rossi.com: orders123
*/

-- Hash corretti generati con bcrypt (rounds=10)
-- admin123 -> $2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8W4uF6FBAGAanj6.P.S3qP3C6QIG
-- warehouse123 -> $2a$10$9OKgEwU5lgHB8WBH1SGc.eKmk/6ssZbdYdGS8i5/r0.SQsndW5cJy
-- orders123 -> $2a$10$3euPcmQFCiblsVhKKlsZe.krAUiCl9jEtZQqa/zX9k.P8B3qFJLJy

-- Aggiorna password utente admin
UPDATE Users 
SET passwordHash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8W4uF6FBAGAanj6.P.S3qP3C6QIG'
WHERE email = 'admin@rossi.com';

-- Aggiorna password utente warehouse
UPDATE Users 
SET passwordHash = '$2a$10$9OKgEwU5lgHB8WBH1SGc.eKmk/6ssZbdYdGS8i5/r0.SQsndW5cJy'
WHERE email = 'warehouse@rossi.com';

-- Aggiorna password utente orders
UPDATE Users 
SET passwordHash = '$2a$10$3euPcmQFCiblsVhKKlsZe.krAUiCl9jEtZQqa/zX9k.P8B3qFJLJy'
WHERE email = 'orders@rossi.com';

-- Verifica che gli utenti esistano
SELECT 
    email, 
    FIRST_NAME + ' ' + LAST_NAME as name, 
    role,
    CASE 
        WHEN passwordHash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Z8W4uF6FBAGAanj6.P.S3qP3C6QIG' THEN 'admin123'
        WHEN passwordHash = '$2a$10$9OKgEwU5lgHB8WBH1SGc.eKmk/6ssZbdYdGS8i5/r0.SQsndW5cJy' THEN 'warehouse123'
        WHEN passwordHash = '$2a$10$3euPcmQFCiblsVhKKlsZe.krAUiCl9jEtZQqa/zX9k.P8B3qFJLJy' THEN 'orders123'
        ELSE 'Password non riconosciuta'
    END as password_chiaro
FROM Users 
WHERE email IN ('admin@rossi.com', 'warehouse@rossi.com', 'orders@rossi.com');

PRINT 'Password aggiornate con successo!';
PRINT 'Credenziali di accesso:';
PRINT '  admin@rossi.com / admin123';
PRINT '  warehouse@rossi.com / warehouse123';
PRINT '  orders@rossi.com / orders123';