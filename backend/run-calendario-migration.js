const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/ark_db'
});

async function runMigration() {
    try {
        console.log('🌱 Executando migração do Calendário de Produção...');
        
        const migrationPath = path.join(__dirname, 'migrations', 'calendario-producao.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        console.log('📊 Tabelas criadas:');
        console.log('   - culturas');
        console.log('   - areas_producao');
        console.log('   - planejamentos_safra');
        console.log('   - atividades_calendario');
        console.log('   - alertas_producao');
        console.log('🌾 Culturas básicas inseridas!');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();