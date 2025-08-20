-- =====================================================
-- ADICIONAR TODAS AS COLUNAS FALTANTES
-- =====================================================

-- Adicionar colunas na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Adicionar colunas na tabela clients  
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Adicionar colunas na tabela partners (se existir)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Adicionar colunas na tabela vendedores (se existir)
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Verificar se as colunas foram criadas
SELECT 'users' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('ativo', 'codigo', 'website')

UNION ALL

SELECT 'clients' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('ativo', 'codigo', 'website')

UNION ALL

SELECT 'partners' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name IN ('ativo', 'codigo', 'website')

UNION ALL

SELECT 'vendedores' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendedores' 
AND column_name IN ('ativo', 'codigo', 'website')

ORDER BY tabela, column_name;