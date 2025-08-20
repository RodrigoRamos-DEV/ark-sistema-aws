const { Pool } = require('pg');
const fs = require('fs');

// Configuração do banco do Render
const renderPool = new Pool({
    connectionString: 'postgresql://postgres:123@localhost:5432/ark_db',
    ssl: false
});

async function backupData() {
    try {
        console.log('🔄 Iniciando backup dos dados do Render...');
        
        const tables = [
            'clients',
            'vendedores', 
            'payments',
            'withdrawals',
            'comissoes_vendedores',
            'pagamentos_comissoes',
            'admin_notifications',
            'dismissed_notifications',
            'produtos_feira',
            'pedidos_feira',
            'itens_pedido_feira'
        ];
        
        let backupSQL = '';
        
        // Adicionar header do backup
        backupSQL += `-- Backup ARK System - ${new Date().toISOString()}\n`;
        backupSQL += `-- Gerado automaticamente\n\n`;
        
        for (const table of tables) {
            try {
                console.log(`📋 Fazendo backup da tabela: ${table}`);
                
                // Verificar se tabela existe
                const tableExists = await renderPool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);
                
                if (!tableExists.rows[0].exists) {
                    console.log(`⚠️  Tabela ${table} não existe, pulando...`);
                    continue;
                }
                
                // Obter estrutura da tabela
                const structure = await renderPool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);
                
                // Obter dados da tabela
                const data = await renderPool.query(`SELECT * FROM ${table}`);
                
                backupSQL += `-- Tabela: ${table}\n`;
                backupSQL += `-- Registros: ${data.rows.length}\n\n`;
                
                if (data.rows.length > 0) {
                    const columns = Object.keys(data.rows[0]);
                    
                    for (const row of data.rows) {
                        const values = columns.map(col => {
                            const value = row[col];
                            if (value === null) return 'NULL';
                            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                            if (value instanceof Date) return `'${value.toISOString()}'`;
                            return value;
                        });
                        
                        backupSQL += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
                    }
                }
                
                backupSQL += `\n`;
                
            } catch (err) {
                console.log(`❌ Erro ao fazer backup da tabela ${table}:`, err.message);
            }
        }
        
        // Salvar backup
        const filename = `backup-render-${new Date().toISOString().slice(0, 10)}.sql`;
        fs.writeFileSync(filename, backupSQL);
        
        console.log(`✅ Backup salvo em: ${filename}`);
        console.log(`📊 Backup concluído com sucesso!`);
        
    } catch (err) {
        console.error('❌ Erro no backup:', err.message);
    } finally {
        await renderPool.end();
    }
}

backupData();