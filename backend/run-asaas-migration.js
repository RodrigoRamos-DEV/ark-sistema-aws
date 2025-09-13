const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAsaasMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Iniciando migração do Asaas...');
    
    const migrationPath = path.join(__dirname, 'migration', 'add-asaas-integration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migração do Asaas concluída com sucesso!');
    
    // Verificar se as colunas foram criadas
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'asaas_customer_id'
    `;
    
    const result = await pool.query(checkQuery);
    if (result.rows.length > 0) {
      console.log('✅ Coluna asaas_customer_id criada na tabela clients');
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  require('dotenv').config();
  runAsaasMigration();
}

module.exports = runAsaasMigration;