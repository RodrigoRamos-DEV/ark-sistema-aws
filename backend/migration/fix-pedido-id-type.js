const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixPedidoIdType() {
    const client = await pool.connect();
    try {
        console.log('🔄 Verificando e corrigindo tipo da coluna pedido_id...');
        
        // Verificar se existe coluna pedido_id
        const checkColumn = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'pedido_id';
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log(`📋 Coluna pedido_id encontrada: ${checkColumn.rows[0].data_type}`);
            
            if (checkColumn.rows[0].data_type === 'integer') {
                console.log('🔧 Convertendo coluna pedido_id de INTEGER para VARCHAR...');
                
                // Remover coluna integer e recriar como VARCHAR
                await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS pedido_id;');
                await client.query('ALTER TABLE transactions ADD COLUMN pedido_id VARCHAR(100);');
                
                console.log('✅ Coluna pedido_id convertida para VARCHAR(100)');
            }
        } else {
            console.log('➕ Criando coluna pedido_id como VARCHAR...');
            await client.query('ALTER TABLE transactions ADD COLUMN pedido_id VARCHAR(100);');
        }
        
        // Verificar/criar coluna pedido_info
        const checkInfo = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'pedido_info';
        `);
        
        if (checkInfo.rows.length === 0) {
            console.log('➕ Criando coluna pedido_info...');
            await client.query('ALTER TABLE transactions ADD COLUMN pedido_info TEXT;');
        }
        
        // Criar índice
        await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_pedido_id ON transactions(pedido_id);');
        
        // Verificar resultado final
        const finalCheck = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name IN ('pedido_id', 'pedido_info');
        `);
        
        console.log('✅ Migração concluída!');
        console.log('📋 Colunas finais:');
        finalCheck.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPedidoIdType();