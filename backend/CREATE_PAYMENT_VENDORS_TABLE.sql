-- =====================================================
-- SCRIPT PARA CRIAR TABELA PAYMENT_VENDORS
-- Execute no pgAdmin para corrigir sistema de comissões
-- =====================================================

-- 1. CRIAR TABELA PAYMENT_VENDORS
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(payment_id, vendor_id)
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payment_vendors_payment_id 
ON payment_vendors(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_vendors_vendor_id 
ON payment_vendors(vendor_id);

CREATE INDEX IF NOT EXISTS idx_payment_vendors_status 
ON payment_vendors(status);

-- 3. VERIFICAR SE A TABELA FOI CRIADA
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_vendors'
ORDER BY ordinal_position;

-- 4. VERIFICAR ESTRUTURA DAS TABELAS RELACIONADAS
-- =====================================================
-- Verificar se as tabelas payments e partners existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'partners')
ORDER BY table_name;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================