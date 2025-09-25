const { Pool } = require('pg');
require('dotenv').config();

async function fixAdminNotificationsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Corrigindo estrutura da tabela admin_notifications...');
    
    // Alterar o tipo da coluna created_by de INTEGER para VARCHAR para suportar UUIDs
    await pool.query(`
      ALTER TABLE admin_notifications 
      ALTER COLUMN created_by TYPE VARCHAR(255)
    `);
    
    console.log('✅ Coluna created_by alterada para VARCHAR(255)');
    
    // Também alterar a tabela dismissed_notifications para usar VARCHAR para user_id
    await pool.query(`
      ALTER TABLE dismissed_notifications 
      ALTER COLUMN user_id TYPE VARCHAR(255)
    `);
    
    console.log('✅ Coluna user_id na tabela dismissed_notifications alterada para VARCHAR(255)');
    
    // Recriar o índice único com o novo tipo
    await pool.query(`
      DROP INDEX IF EXISTS dismissed_notifications_user_id_notification_id_key
    `);
    
    await pool.query(`
      ALTER TABLE dismissed_notifications 
      DROP CONSTRAINT IF EXISTS dismissed_notifications_user_id_notification_id_key
    `);
    
    await pool.query(`
      ALTER TABLE dismissed_notifications 
      ADD CONSTRAINT dismissed_notifications_user_id_notification_id_key 
      UNIQUE (user_id, notification_id)
    `);
    
    console.log('✅ Constraint única recriada');
    
    // Testar inserção com UUID
    const testResult = await pool.query(`
      INSERT INTO admin_notifications (title, message, type, target_audience, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, ['Teste UUID', 'Teste com UUID', 'info', 'all', '47608086-4ffe-4234-a87c-7154b4a8e803']);
    
    console.log('✅ Teste de inserção com UUID funcionou:', testResult.rows[0]);
    
    // Limpar teste
    await pool.query('DELETE FROM admin_notifications WHERE title = $1', ['Teste UUID']);
    console.log('✅ Registro de teste removido');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

fixAdminNotificationsTable();