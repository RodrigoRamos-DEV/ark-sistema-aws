-- =====================================================
-- VERIFICAR E CRIAR TODAS AS COLUNAS QUE O SISTEMA USA
-- =====================================================

-- Baseado na análise completa do dataController.js

-- 1. TABELA USERS - Adicionar colunas faltantes
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'produtor';
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_clients INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_transactions INTEGER DEFAULT 1000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- 2. TABELA CLIENTS - Adicionar colunas faltantes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnpj_cpf VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pix VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_rua VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_uf VARCHAR(2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS full_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_path VARCHAR(500);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_backup_path VARCHAR(500);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_backup_date TIMESTAMP;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(7) DEFAULT '#2c5aa0';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'pessoa_fisica';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);

-- 3. TABELA TRANSACTIONS - Adicionar colunas faltantes
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS employee_id INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,3);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pedido_info TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. TABELA VENDEDORES - Adicionar colunas faltantes
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. TABELA PARTNERS - Adicionar colunas faltantes
ALTER TABLE partners ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- 6. TABELA ITEMS - Adicionar colunas faltantes (produtos unificados)
ALTER TABLE items ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) DEFAULT 'UN';
ALTER TABLE items ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS estoque_atual INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 7. CRIAR TABELAS QUE PODEM NÃO EXISTIR

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de anexos
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    tipo VARCHAR(20) NOT NULL,
    numero_pedido VARCHAR(50),
    cliente_fornecedor VARCHAR(255),
    data_pedido DATE,
    data_entrega DATE,
    total DECIMAL(15,2) DEFAULT 0,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_nome VARCHAR(255),
    quantidade DECIMAL(10,3),
    preco_unitario DECIMAL(10,2),
    subtotal DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de notas fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    numero_nf VARCHAR(50),
    serie VARCHAR(10) DEFAULT '1',
    tipo VARCHAR(20) NOT NULL,
    cliente_fornecedor_nome VARCHAR(255),
    data_emissao DATE,
    data_vencimento DATE,
    valor_total DECIMAL(15,2),
    valor_frete DECIMAL(10,2) DEFAULT 0,
    observacoes TEXT,
    chave_acesso VARCHAR(100),
    status VARCHAR(50) DEFAULT 'emitida',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens da nota fiscal
CREATE TABLE IF NOT EXISTS itens_nota_fiscal (
    id SERIAL PRIMARY KEY,
    nota_fiscal_id INTEGER REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    produto_nome VARCHAR(255),
    produto_codigo VARCHAR(50),
    quantidade DECIMAL(10,3),
    unidade VARCHAR(10) DEFAULT 'UN',
    valor_unitario DECIMAL(10,2),
    valor_total DECIMAL(15,2),
    cfop VARCHAR(10) DEFAULT '5102',
    cst VARCHAR(10) DEFAULT '000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos da vitrine (se não existir)
CREATE TABLE IF NOT EXISTS produtos_vitrine (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco VARCHAR(100),
    quantidade VARCHAR(255),
    unidade VARCHAR(10) DEFAULT 'UN',
    categoria VARCHAR(50),
    fotos TEXT[],
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco TEXT,
    disponivel BOOLEAN DEFAULT true,
    whatsapp VARCHAR(20),
    produtor_nome VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. CRIAR FUNÇÕES QUE O SISTEMA USA

-- Função para gerar número de pedido
CREATE OR REPLACE FUNCTION gerar_numero_pedido(client_uuid UUID, tipo_pedido VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    contador INTEGER;
    numero VARCHAR;
BEGIN
    -- Buscar próximo número para este cliente e tipo
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO contador
    FROM pedidos 
    WHERE client_id = client_uuid AND tipo = tipo_pedido;
    
    -- Gerar número no formato TIPO001, TIPO002, etc.
    numero := UPPER(tipo_pedido) || LPAD(contador::TEXT, 3, '0');
    
    RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de nota fiscal
CREATE OR REPLACE FUNCTION gerar_numero_nf(client_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    contador INTEGER;
    numero VARCHAR;
BEGIN
    -- Buscar próximo número para este cliente
    SELECT COALESCE(MAX(CAST(numero_nf AS INTEGER)), 0) + 1
    INTO contador
    FROM notas_fiscais 
    WHERE client_id = client_uuid;
    
    -- Gerar número sequencial
    numero := LPAD(contador::TEXT, 6, '0');
    
    RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- 9. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_client_type ON users(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_transactions_employee_id ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_items_client_id ON items(client_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_ativo ON items(ativo);
CREATE INDEX IF NOT EXISTS idx_employees_client_id ON employees(client_id);
CREATE INDEX IF NOT EXISTS idx_attachments_transaction_id ON attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_client_id ON pedidos(client_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_client_id ON notas_fiscais(client_id);
CREATE INDEX IF NOT EXISTS idx_produtos_vitrine_client_id ON produtos_vitrine(client_id);

-- 10. VERIFICAÇÃO FINAL - Mostrar o que foi criado
SELECT 'VERIFICAÇÃO CONCLUÍDA!' as status;

-- Contar colunas por tabela
SELECT 
    table_name,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'clients', 'transactions', 'vendedores', 'partners', 'items', 'employees', 'attachments', 'pedidos', 'notas_fiscais', 'produtos_vitrine')
GROUP BY table_name
ORDER BY table_name;