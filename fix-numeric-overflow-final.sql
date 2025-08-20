-- Corrigir overflow numeric definitivamente
ALTER TABLE vendedores 
ALTER COLUMN profit_share TYPE DECIMAL(5,2),
ALTER COLUMN porcentagem TYPE DECIMAL(5,2);

-- Atualizar valores que podem estar causando overflow
UPDATE vendedores 
SET profit_share = LEAST(profit_share, 99.99),
    porcentagem = LEAST(porcentagem, 99.99)
WHERE profit_share > 99.99 OR porcentagem > 99.99;