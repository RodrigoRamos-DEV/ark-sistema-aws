const { Pool } = require('pg');
require('dotenv').config();

async function createSubscriptionsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Criando tabela subscriptions...');
    
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
    
    console.log('✅ Tabela subscriptions criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

createSubscriptionsTable();