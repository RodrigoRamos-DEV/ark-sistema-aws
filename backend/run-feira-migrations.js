require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Iniciando migrações da feira...');

    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', 'add_feira_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Executar migração
    await pool.query(migrationSQL);
    console.log('✅ Tabelas da feira criadas com sucesso!');

    // Verificar se as tabelas foram criadas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('feira_produtos', 'feira_favoritos', 'admin_notifications', 'dismissed_notifications')
      ORDER BY table_name
    `);

    console.log('📋 Tabelas criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('🎉 Migrações concluídas com sucesso!');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('1. Adicionar variáveis AWS no .env:');
    console.log('   AWS_ACCESS_KEY_ID=sua_key');
    console.log('   AWS_SECRET_ACCESS_KEY=sua_secret');
    console.log('   AWS_S3_BUCKET=seu_bucket');
    console.log('   AWS_REGION=us-east-1');
    console.log('');
    console.log('2. Instalar dependências AWS:');
    console.log('   npm install aws-sdk multer uuid');
    console.log('');
    console.log('3. Reiniciar o servidor');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Tabelas já existem, pulando migração...');
    } else {
      console.error('❌ Erro na migração:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigrations();