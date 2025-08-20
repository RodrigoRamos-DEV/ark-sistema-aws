const { Pool } = require('pg');

// String de conexão AWS RDS
const awsConnectionString = 'postgresql://arkadmin:Flamengo20@ark-database.chwuqogmans6.us-east-2.rds.amazonaws.com:5432/arkdb';

async function testAWSConnection() {
    const pool = new Pool({
        connectionString: awsConnectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Testando conexão com AWS RDS...');
        
        const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
        
        console.log('✅ Conexão bem-sucedida!');
        console.log('Hora atual:', result.rows[0].current_time);
        console.log('Versão PostgreSQL:', result.rows[0].postgres_version);
        
        // Testar criação de tabela
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_table (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tabela de teste criada com sucesso!');
        
        // Inserir dados de teste
        await pool.query("INSERT INTO test_table (name) VALUES ('Teste AWS')");
        
        const testData = await pool.query('SELECT * FROM test_table');
        console.log('✅ Dados de teste:', testData.rows);
        
        // Limpar teste
        await pool.query('DROP TABLE test_table');
        console.log('✅ Teste concluído com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro na conexão:', err.message);
        
        if (err.code === 'ENOTFOUND') {
            console.log('💡 Verifique se o endpoint está correto');
        } else if (err.code === 'ECONNREFUSED') {
            console.log('💡 Verifique o Security Group - porta 5432 deve estar aberta');
        } else if (err.message.includes('password')) {
            console.log('💡 Verifique usuário e senha');
        }
    } finally {
        await pool.end();
    }
}

testAWSConnection();