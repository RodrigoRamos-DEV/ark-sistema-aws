-- Sistema de Pedidos/Ordens de Venda
-- IMPORTANTE: Não altera dados existentes, apenas adiciona funcionalidade

-- 1. Tabela de pedidos (cabeçalho)
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    employee_id UUID REFERENCES employees(id),
    tipo VARCHAR(10) CHECK (tipo IN ('venda', 'compra')),
    numero_pedido VARCHAR(50),
    cliente_fornecedor VARCHAR(255), -- Nome do cliente/fornecedor
    data_pedido DATE DEFAULT CURRENT_DATE,
    data_entrega DATE,
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'ENTREGUE', 'CANCELADO')),
    subtotal DECIMAL(15,2) DEFAULT 0,
    desconto DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_nome VARCHAR(255) NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    observacoes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Relacionar pedidos com transactions (para controle financeiro)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES pedidos(id);

-- 4. Função para gerar número do pedido automaticamente
CREATE OR REPLACE FUNCTION gerar_numero_pedido(client_id_param UUID, tipo_param VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    contador INTEGER;
    prefixo VARCHAR(2);
BEGIN
    -- Definir prefixo baseado no tipo
    IF tipo_param = 'venda' THEN
        prefixo := 'VD';
    ELSE
        prefixo := 'CP';
    END IF;
    
    -- Contar pedidos existentes do cliente para este tipo
    SELECT COUNT(*) + 1 INTO contador
    FROM pedidos 
    WHERE client_id = client_id_param AND tipo = tipo_param;
    
    -- Retornar número formatado
    RETURN prefixo || LPAD(contador::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pedidos_updated_at 
    BEFORE UPDATE ON pedidos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_client_id ON pedidos(client_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pedido_id ON transactions(pedido_id);