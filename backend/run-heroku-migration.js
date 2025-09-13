require('dotenv').config();
const db = require('./src/config/db');
const fs = require('fs');

async function runHerokuMigration() {
    try {
        console.log('🚀 Executando migration no Heroku...');
        
        const sql = fs.readFileSync('./create-heroku-tables.sql', 'utf8');
        await db.query(sql);
        
        console.log('✅ Migration executada com sucesso!');
        
        // Verificar se as tabelas foram criadas
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('subscriptions', 'notifications', 'asaas_webhook_events', 'asaas_payments')
            ORDER BY table_name
        `);
        
        console.log('📋 Tabelas criadas:');
        tables.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Erro na migration:', error.message);
    } finally {
        process.exit(0);
    }
}

runHerokuMigration();