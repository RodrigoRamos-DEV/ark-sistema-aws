const { Pool } = require('pg');
require('dotenv').config();

async function deployToProduction() {
  console.log('🚀 INICIANDO DEPLOY PARA PRODUÇÃO...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('1️⃣ Verificando conexão com banco...');
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso\n');
    
    console.log('2️⃣ Executando migrações...');
    
    // Criar tabelas de notificações admin
    await client.query(`
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
    console.log('✅ Tabela admin_notifications OK');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        notification_id INTEGER NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      )
    `);
    console.log('✅ Tabela dismissed_notifications OK');
    
    // Criar índices
    console.log('\n3️⃣ Criando índices...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience ON admin_notifications(target_audience)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id ON dismissed_notifications(user_id)`);
    console.log('✅ Índices criados');
    
    // Verificar admin
    console.log('\n4️⃣ Verificando usuário admin...');
    const adminCheck = await client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
    console.log(`✅ ${adminCheck.rows[0].count} usuário(s) admin encontrado(s)`);
    
    // Teste
    console.log('\n5️⃣ Testando funcionalidades...');
    const testResult = await client.query(`
      INSERT INTO admin_notifications (title, message, type, target_audience, created_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, ['Deploy Test', 'Sistema atualizado', 'success', 'all', 'system']);
    
    await client.query('DELETE FROM admin_notifications WHERE id = $1', [testResult.rows[0].id]);
    console.log('✅ Teste concluído');
    
    client.release();
    
    console.log('\n🎉 DEPLOY PRONTO PARA PRODUÇÃO!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

deployToProduction().catch(console.error);