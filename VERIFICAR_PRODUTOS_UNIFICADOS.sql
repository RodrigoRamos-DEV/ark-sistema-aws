-- =====================================================
-- VERIFICAR ESTRUTURA ATUAL DOS PRODUTOS UNIFICADOS
-- =====================================================

-- 1. Ver se existe tabela products
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'products';

-- 2. Ver estrutura da tabela products (se existir)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- 3. Ver se ainda existem tabelas antigas (compras, vendas)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('compras', 'vendas', 'compra_items', 'venda_items');

-- 4. Ver todas as tabelas que contém "product" no nome
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%product%'
ORDER BY table_name;

-- 5. Ver foreign keys relacionadas a produtos
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY'
AND (tc.table_name LIKE '%product%' OR ccu.table_name LIKE '%product%')
ORDER BY tc.table_name;