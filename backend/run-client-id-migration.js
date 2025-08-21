const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('Executando migração para adicionar client_id...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'add_client_id_to_feira_produtos.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('Migração executada com sucesso!');
    
    // Verificar se a coluna foi criada
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'feira_produtos' AND column_name = 'client_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('Coluna client_id criada com sucesso na tabela feira_produtos');
    } else {
      console.log('Erro: Coluna client_id não foi criada');
    }
    
  } catch (error) {
    console.error('Erro ao executar migração:', error);
  } finally {
    await pool.end();
  }
}

runMigration();