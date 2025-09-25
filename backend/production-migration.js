const { Pool } = require('pg');
require('dotenv').config();

async function runProductionMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Executando migração para produção...');
    
    // 1. Criar tabelas de notificações admin se não existirem
    console.log('1. Criando tabelas de notificações admin...');
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
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        notification_id INTEGER NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      )
    `);
    
    // 2. Verificar se as colunas já são VARCHAR, se não, alterar
    console.log('2. Verificando tipos de dados das colunas...');
    
    const adminNotifColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_notifications' AND column_name = 'created_by'
    `);
    
    if (adminNotifColumns.rows.length > 0 && adminNotifColumns.rows[0].data_type === 'integer') {
      console.log('   Alterando created_by para VARCHAR...');
      await pool.query(`ALTER TABLE admin_notifications ALTER COLUMN created_by TYPE VARCHAR(255)`);
    }
    
    const dismissedColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dismissed_notifications' AND column_name = 'user_id'
    `);
    
    if (dismissedColumns.rows.length > 0 && dismissedColumns.rows[0].data_type === 'integer') {
      console.log('   Alterando user_id para VARCHAR...');
      await pool.query(`ALTER TABLE dismissed_notifications ALTER COLUMN user_id TYPE VARCHAR(255)`);
    }
    
    // 3. Criar índices para performance
    console.log('3. Criando índices...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience 
      ON admin_notifications(target_audience)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at 
      ON admin_notifications(created_at DESC)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id 
      ON dismissed_notifications(user_id)
    `);
    
    // 4. Verificar se existe usuário admin
    console.log('4. Verificando usuário admin...');
    const adminCheck = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin'
    `);
    
    if (adminCheck.rows[0].count === '0') {
      console.log('⚠️  ATENÇÃO: Nenhum usuário admin encontrado!');
      console.log('   Você precisará promover um usuário para admin após o deploy.');
    } else {
      console.log(`✅ ${adminCheck.rows[0].count} usuário(s) admin encontrado(s)`);
    }
    
    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runProductionMigration().catch(console.error);
}

module.exports = runProductionMigration;