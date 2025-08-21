-- =====================================================
-- CORRIGIR TODOS OS ERROS DO SISTEMA
-- =====================================================

-- 1. Corrigir coluna company_name na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- 2. Adicionar colunas faltantes na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix VARCHAR(255);

-- 3. Adicionar colunas faltantes na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_backup_path VARCHAR(500);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pix VARCHAR(255);

-- 4. Verificar se as colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('company_name', 'ativo', 'codigo', 'pix')
ORDER BY column_name;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('logo_backup_path', 'ativo', 'codigo', 'pix')
ORDER BY column_name;