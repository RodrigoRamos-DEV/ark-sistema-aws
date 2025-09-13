-- Criar tabelas em falta no Heroku

-- Tabela subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    client_id UUID,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    urgency VARCHAR(20) DEFAULT 'low',
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela asaas_webhook_events
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payment_id VARCHAR(100),
    payment_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela asaas_payments
CREATE TABLE IF NOT EXISTS asaas_payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(100),
    status VARCHAR(50),
    value DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);