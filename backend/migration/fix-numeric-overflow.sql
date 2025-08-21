-- Corrigir campos numeric que estão causando overflow
ALTER TABLE vendedores ALTER COLUMN porcentagem TYPE DECIMAL(5,2);
ALTER TABLE comissoes_vendedores ALTER COLUMN porcentagem_vendedor TYPE DECIMAL(5,2);

-- Criar tabela para controle de pagamentos de comissões
CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
    mes_referencia VARCHAR(7) NOT NULL,
    valor_comissao DECIMAL(10,2) NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices e constraint
CREATE INDEX IF NOT EXISTS idx_pagamentos_comissoes_vendedor ON pagamentos_comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_comissoes_mes ON pagamentos_comissoes(mes_referencia);
ALTER TABLE pagamentos_comissoes ADD CONSTRAINT IF NOT EXISTS unique_vendedor_mes UNIQUE (vendedor_id, mes_referencia);