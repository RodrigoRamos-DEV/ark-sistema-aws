-- Migração para estrutura de Nota Fiscal
-- Execute este script no seu banco de dados

-- 1. Melhorar tabela de produtos
ALTER TABLE items ADD COLUMN IF NOT EXISTS codigo_produto VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(10) DEFAULT 'UN';
ALTER TABLE items ADD COLUMN IF NOT EXISTS ncm VARCHAR(10);
ALTER TABLE items ADD COLUMN IF NOT EXISTS cfop VARCHAR(4);
ALTER TABLE items ADD COLUMN IF NOT EXISTS aliquota_icms DECIMAL(5,2) DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS aliquota_ipi DECIMAL(5,2) DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS categoria_produto VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 2. Melhorar tabela de clientes/compradores
CREATE TABLE IF NOT EXISTS clientes_nf (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome_razao_social VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE,
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco_logradouro VARCHAR(255),
    endereco_numero VARCHAR(10),
    endereco_complemento VARCHAR(100),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_uf VARCHAR(2),
    endereco_cep VARCHAR(9),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Melhorar tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores_nf (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome_razao_social VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE,
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco_logradouro VARCHAR(255),
    endereco_numero VARCHAR(10),
    endereco_complemento VARCHAR(100),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_uf VARCHAR(2),
    endereco_cep VARCHAR(9),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela para configurações fiscais da empresa
CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) UNIQUE,
    regime_tributario VARCHAR(20) CHECK (regime_tributario IN ('SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL')),
    cnpj VARCHAR(18),
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    certificado_digital_path VARCHAR(500),
    ambiente_nfe VARCHAR(10) DEFAULT 'HOMOLOGACAO' CHECK (ambiente_nfe IN ('PRODUCAO', 'HOMOLOGACAO')),
    serie_nfe INTEGER DEFAULT 1,
    numero_nfe_atual INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela para notas fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    numero_nf INTEGER NOT NULL,
    serie_nf INTEGER DEFAULT 1,
    chave_acesso VARCHAR(44),
    tipo_operacao VARCHAR(1) CHECK (tipo_operacao IN ('0', '1')), -- 0=Entrada, 1=Saída
    cliente_id INTEGER REFERENCES clientes_nf(id),
    fornecedor_id INTEGER REFERENCES fornecedores_nf(id),
    data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_saida TIMESTAMP,
    valor_produtos DECIMAL(15,2) DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    valor_seguro DECIMAL(15,2) DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
    valor_total DECIMAL(15,2) DEFAULT 0,
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'AUTORIZADA', 'CANCELADA', 'REJEITADA')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela para itens da nota fiscal
CREATE TABLE IF NOT EXISTS itens_nota_fiscal (
    id SERIAL PRIMARY KEY,
    nota_fiscal_id INTEGER REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES items(id),
    codigo_produto VARCHAR(50),
    descricao_produto VARCHAR(255) NOT NULL,
    ncm VARCHAR(10),
    cfop VARCHAR(4),
    unidade VARCHAR(10) DEFAULT 'UN',
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    aliquota_icms DECIMAL(5,2) DEFAULT 0,
    valor_icms DECIMAL(15,2) DEFAULT 0,
    aliquota_ipi DECIMAL(5,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_nf_cpf_cnpj ON clientes_nf(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nf_cpf_cnpj ON fornecedores_nf(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_numero ON notas_fiscais(numero_nf, serie_nf);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_chave ON notas_fiscais(chave_acesso);