-- =====================================================
-- SCRIPT PARA CORRIGIR SISTEMA DE NOTIFICAÇÕES
-- Execute no pgAdmin para funcionar em produção
-- =====================================================

-- 1. CRIAR TABELA DE NOTIFICAÇÕES ADMIN
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'empresa', 'produtor')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CRIAR TABELA DE NOTIFICAÇÕES DISPENSADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS dismissed_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience 
ON admin_notifications(target_audience);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at 
ON admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id 
ON dismissed_notifications(user_id);

-- 4. FUNÇÃO PARA LIMPEZA AUTOMÁTICA DE NOTIFICAÇÕES ANTIGAS
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications() 
RETURNS void AS $$
BEGIN
    -- Remover notificações com mais de 30 dias
    DELETE FROM admin_notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Remover dispensas órfãs
    DELETE FROM dismissed_notifications 
    WHERE notification_id NOT IN (SELECT id FROM admin_notifications);
END;
$$ LANGUAGE plpgsql;

-- 5. VERIFICAR SE AS TABELAS FORAM CRIADAS
-- =====================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_notifications', 'dismissed_notifications')
ORDER BY table_name;

-- 6. INSERIR NOTIFICAÇÃO DE TESTE (OPCIONAL)
-- =====================================================
-- Descomente as linhas abaixo para inserir uma notificação de teste:
/*
INSERT INTO admin_notifications (title, message, type, target_audience) 
VALUES (
    'Sistema Atualizado!', 
    'O sistema de notificações foi corrigido e agora funciona em produção.', 
    'success', 
    'all'
);
*/

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================