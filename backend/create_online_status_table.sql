-- Criar tabela para status online
CREATE TABLE IF NOT EXISTS user_online_status (
    client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_user_online_status_last_activity ON user_online_status(last_activity);

-- Função para limpar registros antigos automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_online_status() RETURNS void AS $$
BEGIN
    DELETE FROM user_online_status WHERE last_activity < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;