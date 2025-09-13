const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runCpfMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Iniciando migração CPF...');
    
    const migrationPath = path.join(__dirname, 'migration', 'add-cpf-column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migração CPF concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  require('dotenv').config();
  runCpfMigration();
}

module.exports = runCpfMigration;