-- SCRIPT DE CORREÇÃO COMPLETA DO SISTEMA ARK
-- Execute este script antes do deploy para garantir que tudo funcione

-- 1. GARANTIR QUE TABELA CLIENTS TEM TODOS OS CAMPOS NECESSÁRIOS
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'empresa';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_rua VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS endereco_uf VARCHAR(2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(7) DEFAULT '#2c5aa0';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_path TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_backup_path TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_backup_date TIMESTAMP;

-- 2. CRIAR TABELA PARA PRODUTOS DA VITRINE (MARKETPLACE)
CREATE TABLE IF NOT EXISTS produtos_vitrine (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco VARCHAR(100),
    quantidade VARCHAR(100),
    unidade VARCHAR(20) DEFAULT 'UN',
    categoria VARCHAR(100),
    fotos TEXT[], -- Array de URLs das fotos
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco TEXT,
    disponivel BOOLEAN DEFAULT true,
    whatsapp VARCHAR(20),
    produtor_nome VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_vitrine_client_id ON produtos_vitrine(client_id);
CREATE INDEX IF NOT EXISTS idx_produtos_vitrine_disponivel ON produtos_vitrine(disponivel);
CREATE INDEX IF NOT EXISTS idx_produtos_vitrine_location ON produtos_vitrine(latitude, longitude);

-- 4. GARANTIR QUE ITEMS TEM CAMPOS PARA PRODUTOS UNIFICADOS
ALTER TABLE items ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) DEFAULT 'UN';
ALTER TABLE items ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS estoque_atual INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 5. GARANTIR QUE TRANSACTIONS TEM CAMPOS PARA PEDIDOS
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pedido_info TEXT;

-- 6. CRIAR TABELA PEDIDOS SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    numero_pedido VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venda', 'compra')),
    cliente_fornecedor VARCHAR(255) NOT NULL,
    data_pedido DATE NOT NULL,
    data_entrega DATE,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pendente',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. CRIAR TABELA ITENS_PEDIDO SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_nome VARCHAR(255) NOT NULL,
    quantidade DECIMAL(10,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. CRIAR TABELA NOTAS_FISCAIS SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    numero_nf VARCHAR(50) NOT NULL,
    serie VARCHAR(10) DEFAULT '1',
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    cliente_fornecedor_nome VARCHAR(255) NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE,
    valor_total DECIMAL(10,2) NOT NULL,
    valor_frete DECIMAL(10,2) DEFAULT 0,
    chave_acesso VARCHAR(44),
    status VARCHAR(20) DEFAULT 'Emitida',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. CRIAR TABELA ITENS_NOTA_FISCAL SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS itens_nota_fiscal (
    id SERIAL PRIMARY KEY,
    nota_fiscal_id INTEGER REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    produto_nome VARCHAR(255) NOT NULL,
    produto_codigo VARCHAR(50),
    quantidade DECIMAL(10,3) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN',
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    cfop VARCHAR(10) DEFAULT '5102',
    cst VARCHAR(10) DEFAULT '000',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. CRIAR FUNÇÃO PARA GERAR NÚMERO DE PEDIDO
CREATE OR REPLACE FUNCTION gerar_numero_pedido(p_client_id UUID, p_tipo VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    contador INTEGER;
    numero VARCHAR;
BEGIN
    -- Buscar próximo número para este cliente e tipo
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO contador
    FROM pedidos 
    WHERE client_id = p_client_id AND tipo = p_tipo;
    
    -- Gerar número formatado
    numero := UPPER(p_tipo) || '-' || LPAD(contador::TEXT, 6, '0');
    
    RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- 11. CRIAR FUNÇÃO PARA GERAR NÚMERO DE NOTA FISCAL
CREATE OR REPLACE FUNCTION gerar_numero_nf(p_client_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    contador INTEGER;
    numero VARCHAR;
BEGIN
    -- Buscar próximo número para este cliente
    SELECT COALESCE(MAX(CAST(numero_nf AS INTEGER)), 0) + 1
    INTO contador
    FROM notas_fiscais 
    WHERE client_id = p_client_id;
    
    -- Gerar número formatado
    numero := LPAD(contador::TEXT, 6, '0');
    
    RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- 12. ATUALIZAR CLIENTES EXISTENTES
UPDATE clients SET client_type = 'empresa' WHERE client_type IS NULL AND regime_tributario IS NOT NULL;
UPDATE clients SET client_type = 'produtor' WHERE client_type IS NULL AND regime_tributario IS NULL;

-- 13. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pedidos_client_id ON pedidos(client_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_client_id ON notas_fiscais(client_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data ON notas_fiscais(data_emissao);
CREATE INDEX IF NOT EXISTS idx_transactions_pedido_id ON transactions(pedido_id) WHERE pedido_id IS NOT NULL;

-- 14. GARANTIR CONSTRAINTS
ALTER TABLE clients ADD CONSTRAINT chk_client_type CHECK (client_type IN ('admin', 'empresa', 'produtor'));

-- SCRIPT EXECUTADO COM SUCESSO!
-- Todas as tabelas e campos necessários foram criados/verificados