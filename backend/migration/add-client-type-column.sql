-- Adicionar coluna client_type na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'produtor';

-- Atualizar registros existentes baseado no regime_tributario
UPDATE clients SET client_type = 'empresa' WHERE regime_tributario IS NOT NULL;
UPDATE clients SET client_type = 'produtor' WHERE regime_tributario IS NULL;