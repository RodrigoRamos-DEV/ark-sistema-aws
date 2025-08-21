-- Adicionar campos para agrupamento de pedidos nas transações
-- Execute este script para adicionar suporte a pedidos agrupados

-- Adicionar colunas para pedido_id e pedido_info
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS pedido_info TEXT;

-- Criar índice para melhorar performance nas consultas por pedido
CREATE INDEX IF NOT EXISTS idx_transactions_pedido_id ON transactions(pedido_id);

-- Comentários para documentação
COMMENT ON COLUMN transactions.pedido_id IS 'ID único do pedido para agrupar múltiplos lançamentos';
COMMENT ON COLUMN transactions.pedido_info IS 'Informações descritivas do pedido (ex: Venda - Cliente X - 3 itens)';

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('pedido_id', 'pedido_info');