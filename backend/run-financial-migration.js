const db = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runFinancialMigration() {
    console.log('🚀 Iniciando migração do controle financeiro...');
    
    try {
        // Ler arquivo de migração
        const migrationPath = path.join(__dirname, 'migration', 'controle-financeiro-melhorado.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📝 Executando migração...');
        await db.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        
        // Verificar estrutura criada
        console.log('🔍 Verificando estrutura criada...');
        
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('payment_commissions', 'withdrawals')
            ORDER BY table_name
        `);
        
        console.log('📋 Tabelas criadas:');
        tables.rows.forEach(table => {
            console.log(`  ✓ ${table.table_name}`);
        });
        
        // Verificar view
        const views = await db.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'vw_comissoes_vendedores'
        `);
        
        if (views.rows.length > 0) {
            console.log('  ✓ vw_comissoes_vendedores (view)');
        }
        
        console.log('🎉 Sistema de controle financeiro configurado!');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

// Executar migração
runFinancialMigration();