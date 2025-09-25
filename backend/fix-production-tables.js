const { Pool } = require('pg');
require('dotenv').config();

async function fixProductionTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Corrigindo tabelas em produção...');
    
    // 1. Criar tabela online_status
    await pool.query(`
      CREATE TABLE IF NOT EXISTS online_status (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela online_status criada');
    
    // 2. Criar tabela subscriptions se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        plan VARCHAR(20) DEFAULT 'free',
        status VARCHAR(20) DEFAULT 'active',
        trial_ends_at TIMESTAMP,
        expires_at TIMESTAMP,
        asaas_subscription_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela subscriptions criada');
    
    // 3. Criar tabelas de notificações admin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        target_audience VARCHAR(50) DEFAULT 'all',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela admin_notifications criada');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        notification_id INTEGER NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      )
    `);
    console.log('✅ Tabela dismissed_notifications criada');
    
    // 4. Criar índices
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_online_status_user_id ON online_status(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience ON admin_notifications(target_audience)`);
    console.log('✅ Índices criados');
    
    console.log('\n🎉 TODAS AS TABELAS CORRIGIDAS!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixProductionTables().catch(console.error);