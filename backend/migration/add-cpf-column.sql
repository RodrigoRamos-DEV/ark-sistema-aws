-- Adicionar coluna CPF na tabela users se não existir

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE users ADD COLUMN cpf VARCHAR(20);
        COMMENT ON COLUMN users.cpf IS 'CPF do usuário para integração com Asaas';
    END IF;
END $$;