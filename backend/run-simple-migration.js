const db = require('./src/config/db');
const fs = require('fs');

async function runSimpleMigration() {
    console.log('🚀 Criando tabelas simples...');
    
    try {
        const sql = fs.readFileSync('./create-simple-tables.sql', 'utf8');
        await db.query(sql);
        
        console.log('✅ Tabelas criadas com sucesso!');
        
        // Testar inserção
        const test = await db.query('SELECT COUNT(*) FROM payment_vendors');
        console.log('📊 Tabela payment_vendors:', test.rows[0].count, 'registros');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

runSimpleMigration();