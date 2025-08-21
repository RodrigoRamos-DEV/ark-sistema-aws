-- Adicionar coluna vendedor_id na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES vendedores(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_clients_vendedor ON clients(vendedor_id);