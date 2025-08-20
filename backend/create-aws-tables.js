const { Pool } = require('pg');

const awsPool = new Pool({
    connectionString: 'postgresql://arkadmin:Flamengo20@ark-database.chwuqogmans6.us-east-2.rds.amazonaws.com:5432/arkdb',
    ssl: { rejectUnauthorized: false }
});

async function createTables() {
    try {
        console.log('🔄 Criando estrutura das tabelas na AWS...');
        
        // Criar extensão UUID se não existir
        await awsPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        
        // Tabela clients
        await awsPool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                client_type VARCHAR(50) DEFAULT 'empresa',
                vendedor_id UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela clients criada');
        
        // Tabela vendedores
        await awsPool.query(`
            CREATE TABLE IF NOT EXISTS vendedores (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                porcentagem DECIMAL(5,2) DEFAULT 0,
                profit_share DECIMAL(12,2) DEFAULT 0,
                pix VARCHAR(255) DEFAULT '',
                endereco TEXT DEFAULT '',
                telefone VARCHAR(50) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela vendedores criada');
        
        // Tabela payments
        await awsPool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                client_id UUID REFERENCES clients(id),
                amount DECIMAL(12,2) NOT NULL,
                payment_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela payments criada');
        
        // Tabela withdrawals
        await awsPool.query(`
            CREATE TABLE IF NOT EXISTS withdrawals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                partner_id UUID REFERENCES vendedores(id),
                amount DECIMAL(12,2) NOT NULL,
                withdrawal_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela withdrawals criada');
        
        // Tabela comissoes_vendedores
        await awsPool.query(`
            CREATE TABLE IF NOT EXISTS comissoes_vendedores (
                id SERIAL PRIMARY KEY,
                vendedor_id UUID,
                cliente_id UUID,
                transaction_id UUID,
                valor_venda DECIMAL(12,2) DEFAULT 0,
                valor_vendedor DECIMAL(12,2) DEFAULT 0,
                mes_referencia VARCHAR(7),
                data_venda DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela comissoes_vendedores criada');
        
        // Tabela pagamentos_comissoes
        await awsPool.query(`
            CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
                id SERIAL PRIMARY KEY,
                vendedor_id UUID,
                mes_referencia VARCHAR(7),
                valor_comissao DECIMAL(12,2) DEFAULT 0,
                data_pagamento DATE,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela pagamentos_comissoes criada');
        
        console.log('🎉 Todas as tabelas criadas com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err.message);
    } finally {
        await awsPool.end();
    }
}

createTables();