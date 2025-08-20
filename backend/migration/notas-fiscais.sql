-- Sistema de Notas Fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    numero_nf VARCHAR(20) NOT NULL,
    serie VARCHAR(5) DEFAULT '1',
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    cliente_fornecedor_id UUID REFERENCES items(id),
    cliente_fornecedor_nome VARCHAR(255) NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE,
    valor_produtos DECIMAL(15,2) NOT NULL DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    valor_seguro DECIMAL(15,2) DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
    valor_total DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'emitida' CHECK (status IN ('emitida', 'cancelada', 'inutilizada')),
    observacoes TEXT,
    chave_acesso VARCHAR(44),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, numero_nf, serie)
);

CREATE TABLE IF NOT EXISTS itens_nota_fiscal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_fiscal_id UUID NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES items(id),
    produto_nome VARCHAR(255) NOT NULL,
    produto_codigo VARCHAR(50),
    quantidade DECIMAL(15,3) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN',
    valor_unitario DECIMAL(15,2) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    cfop VARCHAR(4) DEFAULT '5102',
    ncm VARCHAR(8),
    cst VARCHAR(3) DEFAULT '000',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Função para gerar número sequencial de NF
CREATE OR REPLACE FUNCTION gerar_numero_nf(p_client_id UUID, p_serie VARCHAR DEFAULT '1')
RETURNS VARCHAR AS $$
DECLARE
    proximo_numero INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(numero_nf AS INTEGER)), 0) + 1
    INTO proximo_numero
    FROM notas_fiscais
    WHERE client_id = p_client_id AND serie = p_serie;
    
    RETURN LPAD(proximo_numero::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;