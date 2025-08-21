-- =====================================================
-- SCRIPT MANUAL PARA ATUALIZAR BANCO DE DADOS ARK
-- Execute no pgAdmin ou qualquer cliente PostgreSQL
-- =====================================================

-- 1. CRIAR TABELA PARA STATUS ONLINE DOS USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS user_online_status (
    client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CRIAR ÍNDICE PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_online_status_last_activity 
ON user_online_status(last_activity);

-- 3. FUNÇÃO PARA LIMPEZA AUTOMÁTICA (OPCIONAL)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_online_status() 
RETURNS void AS $$
BEGIN
    DELETE FROM user_online_status 
    WHERE last_activity < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- 4. VERIFICAR SE TODAS AS TABELAS EXISTEM
-- =====================================================
-- Execute para verificar se tudo está correto:
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'users', 'user_online_status')
ORDER BY table_name;

-- 5. VERIFICAR ESTRUTURA DA NOVA TABELA
-- =====================================================
-- Execute para ver a estrutura da tabela criada:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_online_status'
ORDER BY ordinal_position;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Após executar este script, o sistema estará 
-- completamente pronto para produção!
-- =====================================================