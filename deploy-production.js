const { Pool } = require('pg');
require('dotenv').config();

async function deployToProduction() {
  console.log('🚀 INICIANDO DEPLOY PARA PRODUÇÃO...\n');
  
  // Usar DATABASE_URL de produção se disponível
  const productionDbUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
  
  const pool = new Pool({
    connectionString: productionDbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('1️⃣ Verificando conexão com banco de produção...');
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso\n');
    
    console.log('2️⃣ Executando migrações de segurança...');
    
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
    console.log('✅ Tabela admin_notifications criada/verificada');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        notification_id INTEGER NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      )
    `);
    console.log('✅ Tabela dismissed_notifications criada/verificada');
    
    // Verificar e corrigir tipos de dados
    console.log('\n3️⃣ Verificando tipos de dados...');
    
    const adminNotifColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_notifications' AND column_name = 'created_by'
    `);
    
    if (adminNotifColumns.rows.length > 0 && adminNotifColumns.rows[0].data_type === 'integer') {
      console.log('🔧 Corrigindo tipo da coluna created_by...');
      await client.query(`ALTER TABLE admin_notifications ALTER COLUMN created_by TYPE VARCHAR(255)`);
      console.log('✅ Coluna created_by corrigida');
    }
    
    const dismissedColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dismissed_notifications' AND column_name = 'user_id'
    `);
    
    if (dismissedColumns.rows.length > 0 && dismissedColumns.rows[0].data_type === 'integer') {
      console.log('🔧 Corrigindo tipo da coluna user_id...');
      await client.query(`ALTER TABLE dismissed_notifications ALTER COLUMN user_id TYPE VARCHAR(255)`);
      console.log('✅ Coluna user_id corrigida');
    }
    
    // Criar índices para performance
    console.log('\n4️⃣ Criando índices de performance...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience 
      ON admin_notifications(target_audience)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at 
      ON admin_notifications(created_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user_id 
      ON dismissed_notifications(user_id)
    `);
    console.log('✅ Índices criados com sucesso');
    
    // Verificar usuário admin
    console.log('\n5️⃣ Verificando usuário admin...');
    const adminCheck = await client.query(`
      SELECT COUNT(*) as count, email FROM users WHERE role = 'admin' GROUP BY email
    `);
    
    if (adminCheck.rows.length === 0) {
      console.log('⚠️  ATENÇÃO: Nenhum usuário admin encontrado!');
      console.log('   Você precisará promover um usuário para admin após o deploy.');
    } else {
      console.log(`✅ ${adminCheck.rows.length} usuário(s) admin encontrado(s):`);
      adminCheck.rows.forEach(row => {
        console.log(`   - ${row.email}`);
      });
    }
    
    // Testar funcionalidade de notificações
    console.log('\n6️⃣ Testando funcionalidades...');
    
    const testResult = await client.query(`
      INSERT INTO admin_notifications (title, message, type, target_audience, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, ['Deploy Test', 'Sistema atualizado com sucesso', 'success', 'all', 'system']);
    
    console.log('✅ Teste de inserção funcionou:', testResult.rows[0].id);
    
    // Limpar teste
    await client.query('DELETE FROM admin_notifications WHERE title = $1', ['Deploy Test']);
    console.log('✅ Teste limpo');
    
    client.release();
    
    console.log('\n🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
    console.log('\n📋 RESUMO:');
    console.log('✅ Tabelas de notificações criadas');
    console.log('✅ Tipos de dados corrigidos');
    console.log('✅ Índices de performance criados');
    console.log('✅ Funcionalidades testadas');
    
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Fazer commit e push do código');
    console.log('2. Deploy no Heroku/servidor');
    console.log('3. Testar funcionalidades no ambiente de produção');
    
  } catch (error) {
    console.error('❌ ERRO NO DEPLOY:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  deployToProduction().catch(console.error);
}

module.exports = deployToProduction;