-- =====================================================
-- CORREÇÃO PARA SCHEMA EXISTENTE - APENAS NOVAS TABELAS
-- =====================================================

-- Criar apenas as tabelas que não existem (sistema de feira)
CREATE TABLE IF NOT EXISTS feira_produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(50),
    quantidade VARCHAR(255),
    preco VARCHAR(100),
    fotos TEXT[],
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    disponivel BOOLEAN DEFAULT true,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produtor VARCHAR(255),
    whatsapp VARCHAR(20),
    endereco TEXT,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feira_favoritos (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES feira_produtos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, produto_id)
);

CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    target_audience VARCHAR(20) DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dismissed_notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_id INTEGER REFERENCES admin_notifications(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_id)
);

-- Adicionar coluna client_type se não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'produtor';

-- Atualizar usuários sem client_type
UPDATE users SET client_type = 'produtor' WHERE client_type IS NULL;

-- Índices apenas para as novas tabelas
CREATE INDEX IF NOT EXISTS idx_feira_produtos_user_id ON feira_produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_feira_produtos_disponivel ON feira_produtos(disponivel);
CREATE INDEX IF NOT EXISTS idx_feira_produtos_categoria ON feira_produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_feira_favoritos_user_id ON feira_favoritos(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON admin_notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id ON dismissed_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_client_type ON users(client_type);

-- =====================================================
-- VERIFICAR ESTRUTURA EXISTENTE
-- =====================================================

-- Ver estrutura da tabela clients
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;

-- Ver estrutura da tabela pedidos (se existir)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
ORDER BY ordinal_position;