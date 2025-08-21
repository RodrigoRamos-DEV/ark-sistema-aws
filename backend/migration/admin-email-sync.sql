-- Adicionar campo email na tabela clients se não existir
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Sincronizar emails existentes dos usuários para os clientes
UPDATE clients 
SET email = (
    SELECT u.email 
    FROM users u 
    WHERE u.client_id = clients.id 
    LIMIT 1
)
WHERE email IS NULL;