-- =====================================================
-- SCHEMA COMPLETO SISTEMA ARK - TODAS AS TABELAS
-- =====================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA PRINCIPAL DE USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    logo_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user',
    client_type VARCHAR(20) DEFAULT 'produtor',
    license_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELAS DO SISTEMA FINANCEIRO
-- =====================================================

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vendedor_id INTEGER,
    client_type VARCHAR(50) DEFAULT 'pessoa_fisica',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    category VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lançamentos Financeiros
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'despesa')),
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    category VARCHAR(100),
    client_id INTEGER REFERENCES clients(id),
    product_id INTEGER REFERENCES products(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendedores
CREATE TABLE IF NOT EXISTS vendedores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    vendedor_id INTEGER REFERENCES vendedores(id),
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendente',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens dos Pedidos
CREATE TABLE IF NOT EXISTS pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notas Fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    pedido_id INTEGER REFERENCES pedidos(id),
    valor_total DECIMAL(15,2) NOT NULL,
    data_emissao DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'emitida',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELAS DO SISTEMA DE FEIRA
-- =====================================================

-- Produtos da Feira
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

-- Favoritos das Empresas
CREATE TABLE IF NOT EXISTS feira_favoritos (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES feira_produtos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, produto_id)
);

-- =====================================================
-- TABELAS DO SISTEMA DE NOTIFICAÇÕES
-- =====================================================

-- Notificações Admin
CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    target_audience VARCHAR(20) DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Notificações Dispensadas
CREATE TABLE IF NOT EXISTS dismissed_notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_id INTEGER REFERENCES admin_notifications(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_id)
);

-- =====================================================
-- TABELAS ADMINISTRATIVAS
-- =====================================================

-- Parceiros/Partners
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices da tabela users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_client_type ON users(client_type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índices das tabelas financeiras
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_vendedor_id ON clients(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_vendedores_user_id ON vendedores(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_client_id ON pedidos(client_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_user_id ON notas_fiscais(user_id);

-- Índices da feira
CREATE INDEX IF NOT EXISTS idx_feira_produtos_user_id ON feira_produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_feira_produtos_disponivel ON feira_produtos(disponivel);
CREATE INDEX IF NOT EXISTS idx_feira_produtos_categoria ON feira_produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_feira_favoritos_user_id ON feira_favoritos(user_id);

-- Índices das notificações
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON admin_notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id ON dismissed_notifications(user_id);

-- Índices administrativos
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO users (id, name, email, password, role, client_type) 
VALUES (
    uuid_generate_v4(),
    'Administrador',
    'admin@arksistemas.com',
    '$2b$10$rQJ5qJ5qJ5qJ5qJ5qJ5qJOqJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5q',
    'admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- COMENTÁRIOS DAS TABELAS
-- =====================================================

COMMENT ON TABLE users IS 'Tabela principal de usuários do sistema';
COMMENT ON TABLE clients IS 'Clientes cadastrados pelos usuários';
COMMENT ON TABLE products IS 'Produtos do sistema financeiro';
COMMENT ON TABLE transactions IS 'Lançamentos financeiros (receitas e despesas)';
COMMENT ON TABLE vendedores IS 'Vendedores cadastrados';
COMMENT ON TABLE pedidos IS 'Pedidos de vendas';
COMMENT ON TABLE pedido_items IS 'Itens dos pedidos';
COMMENT ON TABLE notas_fiscais IS 'Notas fiscais emitidas';
COMMENT ON TABLE feira_produtos IS 'Produtos da feira digital';
COMMENT ON TABLE feira_favoritos IS 'Produtos favoritos das empresas';
COMMENT ON TABLE admin_notifications IS 'Notificações do administrador';
COMMENT ON TABLE dismissed_notifications IS 'Notificações dispensadas pelos usuários';
COMMENT ON TABLE partners IS 'Parceiros do sistema';
COMMENT ON TABLE audit_logs IS 'Log de auditoria do sistema';

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================