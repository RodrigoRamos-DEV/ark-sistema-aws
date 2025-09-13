-- Adicionar colunas para integração com Asaas

-- Tabela de clientes
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(100);

-- Tabela de pedidos
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING';

-- Tabela para eventos de webhook
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payment_id VARCHAR(100),
  payment_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id ON clients(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_asaas_payment_id ON pedidos(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON asaas_webhook_events(payment_id);

COMMENT ON COLUMN clients.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN pedidos.asaas_payment_id IS 'ID da cobrança no Asaas';
COMMENT ON COLUMN pedidos.payment_status IS 'Status do pagamento: PENDING, RECEIVED, OVERDUE, CONFIRMED';