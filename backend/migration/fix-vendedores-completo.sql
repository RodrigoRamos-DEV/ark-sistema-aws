-- Corrigir overflow numeric e implementar controle financeiro completo

-- 1. Corrigir campos DECIMAL para evitar overflow
ALTER TABLE vendedores 
ALTER COLUMN profit_share TYPE DECIMAL(5,2),
ALTER COLUMN porcentagem TYPE DECIMAL(5,2);

-- 2. Criar tabela de pagamentos de comissões se não existir
CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES vendedores(id),
    mes_referencia VARCHAR(7) NOT NULL, -- formato YYYY-MM
    valor_comissao DECIMAL(10,2) NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, pago
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendedor_id, mes_referencia)
);

-- 3. Criar tabela de comissões se não existir
CREATE TABLE IF NOT EXISTS comissoes_vendedores (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES vendedores(id),
    cliente_id UUID REFERENCES clients(id),
    transaction_id UUID REFERENCES transactions(id),
    valor_venda DECIMAL(10,2) NOT NULL,
    valor_vendedor DECIMAL(10,2) NOT NULL,
    mes_referencia VARCHAR(7) NOT NULL,
    data_venda DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes ON pagamentos_comissoes(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_pagamentos_vendedor ON pagamentos_comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_mes ON comissoes_vendedores(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON comissoes_vendedores(vendedor_id);

-- 5. Inserir dados iniciais se não existirem
INSERT INTO vendedores (name, profit_share, porcentagem, pix, endereco, telefone) 
VALUES ('Rodrigo Ramos CEO', 0.00, 0.00, '', '', '')
ON CONFLICT (name) DO NOTHING;