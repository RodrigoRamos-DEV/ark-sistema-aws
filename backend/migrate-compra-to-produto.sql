-- Migração: alterar todos os itens do tipo 'compra' para 'produto'
UPDATE items SET type = 'produto' WHERE type = 'compra';

-- Verificar resultado
SELECT COUNT(*) as total_produtos FROM items WHERE type = 'produto';
SELECT COUNT(*) as total_compras FROM items WHERE type = 'compra';