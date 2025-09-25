const { Pool } = require('pg');
require('dotenv').config();

async function createAdminNotificationsTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Criando tabelas de notificações admin...');
    
    // Criar tabela admin_notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        target_audience VARCHAR(50) DEFAULT 'all',
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela admin_notifications criada com sucesso!');
    
    // Criar tabela dismissed_notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        notification_id INTEGER NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      )
    `);
    
    console.log('✅ Tabela dismissed_notifications criada com sucesso!');
    
    // Adicionar índices para melhor performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience 
      ON admin_notifications(target_audience);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at 
      ON admin_notifications(created_at DESC);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id 
      ON dismissed_notifications(user_id);
    `);
    
    console.log('✅ Índices criados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminNotificationsTables();