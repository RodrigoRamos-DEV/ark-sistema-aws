-- Script para corrigir overflow e criar estrutura completa

-- 1. Corrigir campos DECIMAL na tabela vendedores
DO $$
BEGIN
    -- Alterar campos para evitar overflow
    ALTER TABLE vendedores ALTER COLUMN profit_share TYPE DECIMAL(5,2);
    ALTER TABLE vendedores ALTER COLUMN porcentagem TYPE DECIMAL(5,2);
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Erro ao alterar campos: %', SQLERRM;
END $$;

-- 2. Criar tabela de pagamentos de comissões
CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER,
    mes_referencia VARCHAR(7) NOT NULL,
    valor_comissao DECIMAL(12,2) NOT NULL DEFAULT 0,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criar índice único para evitar duplicatas
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pagamentos_vendedor_mes 
    ON pagamentos_comissoes(vendedor_id, mes_referencia);
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Índice já existe';
END $$;

-- 4. Criar tabela de comissões se não existir
CREATE TABLE IF NOT EXISTS comissoes_vendedores (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER,
    cliente_id UUID,
    transaction_id UUID,
    valor_venda DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_vendedor DECIMAL(12,2) NOT NULL DEFAULT 0,
    mes_referencia VARCHAR(7) NOT NULL,
    data_venda DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_comissoes_mes ON comissoes_vendedores(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON comissoes_vendedores(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes ON pagamentos_comissoes(mes_referencia);

-- 6. Verificar se Rodrigo CEO existe, se não, criar
INSERT INTO vendedores (name, profit_share, porcentagem, pix, endereco, telefone) 
VALUES ('Rodrigo Ramos CEO', 0.00, 0.00, '', '', '')
ON CONFLICT (name) DO NOTHING;

-- 7. Atualizar valores que podem estar causando overflow
UPDATE vendedores 
SET profit_share = LEAST(profit_share, 100.00),
    porcentagem = LEAST(porcentagem, 100.00)
WHERE profit_share > 100 OR porcentagem > 100;

COMMIT;