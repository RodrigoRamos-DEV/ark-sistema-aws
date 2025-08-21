-- Criar tabelas simples para comissões
CREATE TABLE IF NOT EXISTS payment_vendors (
    id SERIAL PRIMARY KEY,
    payment_id UUID NOT NULL,
    vendedor_id INTEGER NOT NULL,
    porcentagem DECIMAL(5,2) NOT NULL,
    valor_comissao DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_vendors_payment ON payment_vendors(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_vendors_vendedor ON payment_vendors(vendedor_id);