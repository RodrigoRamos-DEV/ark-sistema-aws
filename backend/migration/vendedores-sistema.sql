-- Renomear tabela partners para vendedores
ALTER TABLE partners RENAME TO vendedores;

-- Adicionar campos necessários para vendedores
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS porcentagem DECIMAL(5,2) DEFAULT 0;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS pix VARCHAR(255);
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- Atualizar referências na tabela clients
ALTER TABLE clients RENAME COLUMN partner_id TO vendedor_id;

-- Inserir Rodrigo Ramos CEO como vendedor principal
INSERT INTO vendedores (name, profit_share, porcentagem, pix, endereco, telefone) 
VALUES ('Rodrigo Ramos CEO', 0, 0, '', '', '') 
ON CONFLICT DO NOTHING;

-- Criar tabela para controle de comissões
CREATE TABLE IF NOT EXISTS comissoes_vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    vendedor_id UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
    valor_venda DECIMAL(10,2) NOT NULL,
    porcentagem_vendedor DECIMAL(5,2) NOT NULL,
    valor_vendedor DECIMAL(10,2) NOT NULL,
    valor_rodrigo DECIMAL(10,2) NOT NULL,
    mes_referencia VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Função para calcular comissões quando há venda
CREATE OR REPLACE FUNCTION calcular_comissao_venda() RETURNS TRIGGER AS $$
DECLARE
    v_vendedor_id UUID;
    v_porcentagem DECIMAL(5,2);
    v_valor_vendedor DECIMAL(10,2);
    v_valor_rodrigo DECIMAL(10,2);
    v_mes_ref VARCHAR(7);
BEGIN
    -- Só calcular para vendas
    IF NEW.type = 'venda' THEN
        -- Buscar vendedor do cliente
        SELECT c.vendedor_id, v.porcentagem 
        INTO v_vendedor_id, v_porcentagem
        FROM clients c
        LEFT JOIN vendedores v ON c.vendedor_id = v.id
        WHERE c.id = NEW.client_id;
        
        -- Se tem vendedor cadastrado
        IF v_vendedor_id IS NOT NULL AND v_porcentagem > 0 THEN
            v_mes_ref := to_char(NEW.transaction_date, 'YYYY-MM');
            v_valor_vendedor := NEW.total_price * v_porcentagem / 100;
            v_valor_rodrigo := NEW.total_price - v_valor_vendedor;
            
            -- Registrar comissão
            INSERT INTO comissoes_vendedores (
                client_id, vendedor_id, valor_venda, porcentagem_vendedor,
                valor_vendedor, valor_rodrigo, mes_referencia
            ) VALUES (
                NEW.client_id, v_vendedor_id, NEW.total_price, v_porcentagem,
                v_valor_vendedor, v_valor_rodrigo, v_mes_ref
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular comissões automaticamente
DROP TRIGGER IF EXISTS trigger_calcular_comissao ON transactions;
CREATE TRIGGER trigger_calcular_comissao
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION calcular_comissao_venda();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comissoes_mes ON comissoes_vendedores(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON comissoes_vendedores(vendedor_id);