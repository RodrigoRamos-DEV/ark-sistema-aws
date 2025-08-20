-- Migração para unificar produtos (manter compatibilidade total)
-- IMPORTANTE: Não remove dados existentes, apenas adiciona campos

-- 1. Adicionar campos opcionais para produtos
ALTER TABLE items ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) DEFAULT 'UN';
ALTER TABLE items ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS estoque_atual INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 2. Criar view para manter compatibilidade com sistema atual
CREATE OR REPLACE VIEW produtos_view AS 
SELECT 
    id,
    client_id,
    name,
    type,
    codigo,
    unidade,
    categoria,
    preco_venda,
    preco_custo,
    estoque_atual,
    estoque_minimo,
    observacoes,
    ativo
FROM items 
WHERE type IN ('produto', 'compra') AND ativo = true;