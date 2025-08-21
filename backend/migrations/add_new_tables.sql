-- Tabela para backups
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    backup_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(45)
);

-- Tabela para configurações do dashboard
CREATE TABLE IF NOT EXISTS dashboard_configs (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    widgets JSONB DEFAULT '[]',
    layout JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar campos de licença na tabela clients se não existirem
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS license_status VARCHAR(20) DEFAULT 'active';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_backups_client_id ON backups(client_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_client_id ON dashboard_configs(client_id);