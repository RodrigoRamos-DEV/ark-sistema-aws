const { Pool } = require('pg');
require('dotenv').config();

async function fixConstraints() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Corrigindo constraints...');
    
    // Primeiro, remover a constraint única
    await pool.query(`
      ALTER TABLE dismissed_notifications 
      DROP CONSTRAINT IF EXISTS dismissed_notifications_user_id_notification_id_key
    `);
    
    console.log('✅ Constraint única removida');
    
    // Recriar a constraint única
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

fixConstraints();