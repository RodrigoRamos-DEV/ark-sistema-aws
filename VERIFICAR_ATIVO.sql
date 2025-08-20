-- Verificar quais tabelas têm a coluna 'ativo'
SELECT 
    t.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ TEM'
        ELSE '❌ FALTA'
    END as tem_ativo
FROM (
    SELECT 'users' as table_name
    UNION SELECT 'clients'
    UNION SELECT 'transactions' 
    UNION SELECT 'vendedores'
    UNION SELECT 'partners'
    UNION SELECT 'items'
    UNION SELECT 'employees'
    UNION SELECT 'products'
) t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND c.column_name = 'ativo'
    AND c.table_schema = 'public'
ORDER BY t.table_name;

-- Adicionar coluna ativo em TODAS as tabelas que podem precisar
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Se existir tabela products, adicionar também
ALTER TABLE products ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Verificar novamente
SELECT 
    t.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ TEM'
        ELSE '❌ FALTA'
    END as tem_ativo_agora
FROM (
    SELECT 'users' as table_name
    UNION SELECT 'clients'
    UNION SELECT 'transactions' 
    UNION SELECT 'vendedores'
    UNION SELECT 'partners'
    UNION SELECT 'items'
    UNION SELECT 'employees'
    UNION SELECT 'products'
) t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND c.column_name = 'ativo'
    AND c.table_schema = 'public'
ORDER BY t.table_name;