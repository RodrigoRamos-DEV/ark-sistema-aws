const { Pool } = require('pg');
require('dotenv').config();

async function checkUsersTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Verificando estrutura da tabela users...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela users:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();