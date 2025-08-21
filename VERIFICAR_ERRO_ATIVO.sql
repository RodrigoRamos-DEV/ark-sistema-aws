-- Testar as queries que mais usam 'ativo' no sistema

-- 1. Teste query de produtos (mais comum)
SELECT id, name, codigo, unidade, categoria, preco_venda, preco_custo, 
       estoque_atual, estoque_minimo, observacoes, type, ativo
FROM items 
WHERE client_id = '00000000-0000-0000-0000-000000000001' AND type IN ('produto', 'compra') AND ativo = true 
ORDER BY name
LIMIT 1;

-- 2. Teste com alias (pode ser o problema)
SELECT i.id, i.name, i.ativo
FROM items i
WHERE i.client_id = '00000000-0000-0000-0000-000000000001' AND i.ativo = true
LIMIT 1;

-- 3. Verificar se existe alguma view ou função que usa 'ativo'
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition ILIKE '%ativo%'
AND schemaname = 'public';

-- 4. Verificar se existe alguma função que usa 'ativo'
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE prosrc ILIKE '%ativo%';

-- 5. Mostrar estrutura completa da tabela items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Testar se o erro é de case sensitive
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'items' 
AND table_schema = 'public'
AND (column_name = 'ativo' OR column_name = 'ATIVO' OR column_name = 'Ativo');

SELECT 'Testes concluídos' as status;