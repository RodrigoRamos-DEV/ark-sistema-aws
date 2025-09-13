-- Tabela para armazenar mensagens do chatbot
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'bot')),
    location JSONB, -- Armazena coordenadas GPS se disponível
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- Tabela para armazenar dados coletados dos usuários
CREATE TABLE IF NOT EXISTS user_data_collection (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL, -- 'location', 'culture_interest', 'problem_reported', etc.
    data_value JSONB NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'chat', 'recommendation', 'form', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_type ON user_data_collection(data_type);
CREATE INDEX IF NOT EXISTS idx_user_data_created_at ON user_data_collection(created_at);