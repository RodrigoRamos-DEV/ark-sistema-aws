const { Pool } = require('pg');
require('dotenv').config();

async function testAdminNotifications() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Testando conexão com banco de dados...');
    
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão com banco estabelecida');
    
    // Verificar se as tabelas existem
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('admin_notifications', 'dismissed_notifications')
    `);
    
    console.log('Tabelas encontradas:', tablesResult.rows.map(row => row.table_name));
    
    // Verificar estrutura da tabela admin_notifications
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_notifications'
    `);
    
    console.log('Colunas da tabela admin_notifications:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Testar inserção de uma notificação de teste
    const insertResult = await client.query(`
      INSERT INTO admin_notifications (title, message, type, target_audience, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, ['Teste', 'Mensagem de teste', 'info', 'all', 1]);
    
    console.log('✅ Notificação de teste inserida:', insertResult.rows[0]);
    
    // Buscar todas as notificações
    const selectResult = await client.query('SELECT * FROM admin_notifications ORDER BY created_at DESC');
    console.log(`✅ Total de notificações: ${selectResult.rows.length}`);
    
    // Limpar notificação de teste
    await client.query('DELETE FROM admin_notifications WHERE title = $1', ['Teste']);
    console.log('✅ Notificação de teste removida');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testAdminNotifications();