-- Sistema de controle financeiro melhorado

-- Primeiro, verificar o tipo da coluna id na tabela vendedores
DO $$
DECLARE
    vendedor_id_type TEXT;
BEGIN
    SELECT data_type INTO vendedor_id_type
    FROM information_schema.columns 
    WHERE table_name = 'vendedores' AND column_name = 'id';
    
    RAISE NOTICE 'Tipo da coluna vendedores.id: %', vendedor_id_type;
END $$;

-- 1. Tabela para comissões por pagamento (múltiplos vendedores)
-- Usando tipo genérico para compatibilidade
CREATE TABLE IF NOT EXISTS payment_commissions (
    id SERIAL PRIMARY KEY,
    payment_id UUID NOT NULL,
    vendedor_id INTEGER NOT NULL,
    porcentagem DECIMAL(5,2) NOT NULL,
    valor_comissao DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    data_pagamento DATE NULL,
    withdrawal_id INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de retiradas de vendedores (se não existir)
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    withdrawal_date DATE NOT NULL,
    tipo VARCHAR(20) DEFAULT 'manual',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar chaves estrangeiras depois, se as tabelas existirem
DO $$
BEGIN
    -- Tentar adicionar FK para payments
    BEGIN
        ALTER TABLE payment_commissions 
        ADD CONSTRAINT fk_payment_commissions_payment 
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'FK payment_commissions -> payments já existe';
        WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar FK para payments: %', SQLERRM;
    END;
    
    -- Tentar adicionar FK para vendedores
    BEGIN
        ALTER TABLE payment_commissions 
        ADD CONSTRAINT fk_payment_commissions_vendedor 
        FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'FK payment_commissions -> vendedores já existe';
        WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar FK para vendedores: %', SQLERRM;
    END;
    
    -- Tentar adicionar FK para withdrawals
    BEGIN
        ALTER TABLE withdrawals 
        ADD CONSTRAINT fk_withdrawals_vendedor 
        FOREIGN KEY (partner_id) REFERENCES vendedores(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'FK withdrawals -> vendedores já existe';
        WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar FK para vendedores em withdrawals: %', SQLERRM;
    END;
END $$;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_commissions_payment ON payment_commissions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_commissions_vendedor ON payment_commissions(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_payment_commissions_status ON payment_commissions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_partner ON withdrawals(partner_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_date ON withdrawals(withdrawal_date);

-- 4. View para relatório de comissões por vendedor (criada depois)
DO $$
BEGIN
    BEGIN
        CREATE OR REPLACE VIEW vw_comissoes_vendedores AS
        SELECT 
            v.id as vendedor_id,
            v.name as vendedor_nome,
            v.pix,
            DATE_TRUNC('month', p.payment_date) as mes_referencia,
            TO_CHAR(p.payment_date, 'YYYY-MM') as mes_string,
            COUNT(pc.id) as total_pagamentos,
            COALESCE(SUM(pc.valor_comissao), 0) as total_comissoes,
            COALESCE(SUM(CASE WHEN pc.status = 'pago' THEN pc.valor_comissao ELSE 0 END), 0) as total_pago,
            COALESCE(SUM(CASE WHEN pc.status = 'pendente' THEN pc.valor_comissao ELSE 0 END), 0) as total_pendente,
            CASE 
                WHEN COUNT(pc.id) = 0 THEN 'sem_comissoes'
                WHEN SUM(CASE WHEN pc.status = 'pago' THEN 1 ELSE 0 END) = COUNT(pc.id) THEN 'tudo_pago'
                WHEN SUM(CASE WHEN pc.status = 'pago' THEN 1 ELSE 0 END) = 0 THEN 'tudo_pendente'
                ELSE 'parcial'
            END as status_geral
        FROM vendedores v
        LEFT JOIN payment_commissions pc ON v.id = pc.vendedor_id
        LEFT JOIN payments p ON pc.payment_id = p.id
        GROUP BY v.id, v.name, v.pix, DATE_TRUNC('month', p.payment_date), TO_CHAR(p.payment_date, 'YYYY-MM');
        
        RAISE NOTICE 'View vw_comissoes_vendedores criada com sucesso';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar view: %', SQLERRM;
    END;
END $$;