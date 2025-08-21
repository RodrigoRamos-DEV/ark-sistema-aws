const db = require('./src/config/db');

async function fixVendedoresSchema() {
    try {
        console.log('Verificando estrutura da tabela vendedores...');
        
        // Verificar colunas existentes
        const columns = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'vendedores' 
            ORDER BY ordinal_position
        `);
        
        console.log('Colunas atuais da tabela vendedores:');
        columns.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}`);
        });
        
        // Adicionar colunas faltantes
        console.log('\nAdicionando colunas faltantes...');
        
        await db.query(`
            ALTER TABLE vendedores 
            ADD COLUMN IF NOT EXISTS porcentagem DECIMAL(5,2) DEFAULT 0
        `);
        console.log('✅ Coluna porcentagem adicionada');
        
        await db.query(`
            ALTER TABLE vendedores 
            ADD COLUMN IF NOT EXISTS pix VARCHAR(255) DEFAULT ''
        `);
        console.log('✅ Coluna pix adicionada');
        
        await db.query(`
            ALTER TABLE vendedores 
            ADD COLUMN IF NOT EXISTS endereco TEXT DEFAULT ''
        `);
        console.log('✅ Coluna endereco adicionada');
        
        await db.query(`
            ALTER TABLE vendedores 
            ADD COLUMN IF NOT EXISTS telefone VARCHAR(50) DEFAULT ''
        `);
        console.log('✅ Coluna telefone adicionada');
        
        // Verificar estrutura final
        const finalColumns = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'vendedores' 
            ORDER BY ordinal_position
        `);
        
        console.log('\nEstrutura final da tabela vendedores:');
        finalColumns.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}`);
        });
        
        console.log('\n✅ Migração concluída com sucesso!');
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Erro na migração:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

fixVendedoresSchema();