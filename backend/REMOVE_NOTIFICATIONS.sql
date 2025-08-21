-- =====================================================
-- SCRIPT PARA REMOVER NOTIFICAÇÕES MANUALMENTE
-- Execute no pgAdmin
-- =====================================================

-- 1. VER TODAS AS NOTIFICAÇÕES EXISTENTES
-- =====================================================
SELECT 
    id,
    title,
    message,
    type,
    target_audience,
    created_at
FROM admin_notifications 
ORDER BY created_at DESC;

-- 2. REMOVER NOTIFICAÇÃO ESPECÍFICA (substitua o ID)
-- =====================================================
-- Primeiro, remover dispensas relacionadas
-- DELETE FROM dismissed_notifications WHERE notification_id = 'SEU_ID_AQUI';

-- Depois, remover a notificação
-- DELETE FROM admin_notifications WHERE id = 'SEU_ID_AQUI';

-- 3. REMOVER TODAS AS NOTIFICAÇÕES (CUIDADO!)
-- =====================================================
-- Descomente as linhas abaixo para remover TODAS as notificações:
/*
DELETE FROM dismissed_notifications;
DELETE FROM admin_notifications;
*/

-- 4. REMOVER NOTIFICAÇÕES POR TÍTULO
-- =====================================================
-- Exemplo: remover notificações com título específico
-- DELETE FROM dismissed_notifications 
-- WHERE notification_id IN (
--     SELECT id FROM admin_notifications 
--     WHERE title LIKE '%Sistema Atualizado%'
-- );
-- 
-- DELETE FROM admin_notifications 
-- WHERE title LIKE '%Sistema Atualizado%';

-- 5. REMOVER NOTIFICAÇÕES ANTIGAS (mais de 7 dias)
-- =====================================================
-- DELETE FROM dismissed_notifications 
-- WHERE notification_id IN (
--     SELECT id FROM admin_notifications 
--     WHERE created_at < NOW() - INTERVAL '7 days'
-- );
-- 
-- DELETE FROM admin_notifications 
-- WHERE created_at < NOW() - INTERVAL '7 days';

-- 6. VERIFICAR SE FOI REMOVIDO
-- =====================================================
SELECT COUNT(*) as total_notifications FROM admin_notifications;
SELECT COUNT(*) as total_dismissed FROM dismissed_notifications;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute a query SELECT primeiro para ver as notificações
-- 2. Copie o ID da notificação que quer remover
-- 3. Substitua 'SEU_ID_AQUI' pelo ID copiado
-- 4. Descomente e execute as linhas DELETE
-- =====================================================