-- Corrigir referências de partner_id para vendedor_id

-- 1. Adicionar coluna vendedor_id na tabela clients se não existir
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vendedor_id INTEGER;

-- 2. Corrigir tabela withdrawals se existir
DO $$
BEGIN
    -- Verificar se a tabela withdrawals existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        -- Adicionar coluna vendedor_id se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'vendedor_id') THEN
            ALTER TABLE withdrawals ADD COLUMN vendedor_id INTEGER;
        END IF;
        
        -- Copiar dados de partner_id para vendedor_id se partner_id existir
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'partner_id') THEN
            UPDATE withdrawals SET vendedor_id = partner_id WHERE vendedor_id IS NULL;
            -- Remover coluna partner_id
            ALTER TABLE withdrawals DROP COLUMN IF EXISTS partner_id;
        END IF;
    END IF;
END $$;

-- 3. Criar índices se necessário
CREATE INDEX IF NOT EXISTS idx_clients_vendedor ON clients(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_vendedor ON withdrawals(vendedor_id) WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals');

COMMIT;