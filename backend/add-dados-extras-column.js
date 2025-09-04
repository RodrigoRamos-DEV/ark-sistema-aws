const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addDadosExtrasColumn() {
    const client = await pool.connect();
    try {
        console.log('Verificando se a coluna dados_extras já existe...');
        
        // Verificar se a coluna já existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'items' AND column_name = 'dados_extras'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('Coluna dados_extras já existe na tabela items');
            return;
        }
        
        console.log('Adicionando coluna dados_extras à tabela items...');
        
        // Adicionar a coluna
        await client.query(`
            ALTER TABLE items 
            ADD COLUMN dados_extras TEXT
        `);
        
        console.log('Coluna dados_extras adicionada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao adicionar coluna:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

addDadosExtrasColumn();