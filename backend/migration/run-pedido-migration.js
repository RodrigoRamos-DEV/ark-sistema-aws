const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔄 Executando migração para adicionar campos de pedido...');
        
        // Adicionar colunas para pedido_id e pedido_info
        await client.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS pedido_info TEXT;
        `);
        
        // Criar índice para melhorar performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_transactions_pedido_id ON transactions(pedido_id);
        `);
        
        // Verificar se as colunas foram criadas
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name IN ('pedido_id', 'pedido_info');
        `);
        
        console.log('✅ Migração concluída com sucesso!');
        console.log('📋 Colunas adicionadas:');
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name} (${row.data_type})`);
        });
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();