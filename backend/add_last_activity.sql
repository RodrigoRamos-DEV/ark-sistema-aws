-- Adicionar coluna last_activity na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();

-- Atualizar registros existentes
UPDATE clients SET last_activity = NOW() WHERE last_activity IS NULL;