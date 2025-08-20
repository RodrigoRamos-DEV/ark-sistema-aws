-- Primeiro, deletar itens do tipo 'compra' que já existem como 'produto'
DELETE FROM items 
WHERE type = 'compra' 
AND EXISTS (
    SELECT 1 FROM items i2 
    WHERE i2.client_id = items.client_id 
    AND i2.type = 'produto' 
    AND i2.name = items.name
);

-- Agora migrar os restantes
UPDATE items SET type = 'produto' WHERE type = 'compra';

-- Verificar resultado
SELECT COUNT(*) as total_produtos FROM items WHERE type = 'produto';
SELECT COUNT(*) as total_compras FROM items WHERE type = 'compra';