const { Pool } = require('pg');
const fs = require('fs');

// Configuração do banco AWS RDS (será preenchida depois)
const awsPool = new Pool({
    connectionString: 'postgresql://arkadmin:Flamengo20@ark-database.chwuqogmans6.us-east-2.rds.amazonaws.com:5432/arkdb',
    ssl: { rejectUnauthorized: false }
});

async function restoreData(backupFile) {
    try {
        console.log('🔄 Iniciando restauração dos dados na AWS...');
        
        if (!fs.existsSync(backupFile)) {
            throw new Error(`Arquivo de backup não encontrado: ${backupFile}`);
        }
        
        const backupSQL = fs.readFileSync(backupFile, 'utf8');
        const statements = backupSQL.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));
        
        console.log(`📋 Executando ${statements.length} comandos SQL...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                try {
                    await awsPool.query(statement);
                    if (i % 100 === 0) {
                        console.log(`⏳ Progresso: ${i}/${statements.length} comandos executados`);
                    }
                } catch (err) {
                    console.log(`⚠️  Erro no comando ${i + 1}: ${err.message}`);
                }
            }
        }
        
        console.log('✅ Restauração concluída com sucesso!');
        
        // Verificar dados restaurados
        const tables = ['clients', 'vendedores', 'payments'];
        for (const table of tables) {
            try {
                const count = await awsPool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`📊 ${table}: ${count.rows[0].count} registros`);
            } catch (err) {
                console.log(`❌ Erro ao verificar ${table}: ${err.message}`);
            }
        }
        
    } catch (err) {
        console.error('❌ Erro na restauração:', err.message);
    } finally {
        await awsPool.end();
    }
}

// Usar: node restore-to-aws.js backup-render-2025-08-19.sql
const backupFile = process.argv[2];
if (!backupFile) {
    console.log('❌ Uso: node restore-to-aws.js <arquivo-backup.sql>');
    process.exit(1);
}

restoreData(backupFile);