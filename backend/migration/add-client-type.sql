-- Adicionar coluna client_type na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'empresa';

-- Atualizar registros existentes para 'empresa' se não tiverem valor
UPDATE clients SET client_type = 'empresa' WHERE client_type IS NULL;