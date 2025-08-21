-- Migração para melhorar perfil da empresa
-- Adiciona campos para PIX, CNPJ/CPF e outras informações

ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnpj_cpf VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pix VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Campos fiscais já existem, mas garantindo que estão lá
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20);