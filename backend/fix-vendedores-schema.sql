-- Adicionar colunas faltantes na tabela vendedores
ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS porcentagem DECIMAL(5,2) DEFAULT 0;

ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS pix VARCHAR(255) DEFAULT '';

ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS endereco TEXT DEFAULT '';

ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS telefone VARCHAR(50) DEFAULT '';

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'vendedores' 
ORDER BY ordinal_position;