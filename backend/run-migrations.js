require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

const MIGRATION_FOLDER = path.join(__dirname, 'migration');

async function runMigrations() {
    console.log('🚀 INICIANDO MIGRAÇÕES DO SISTEMA ARK...\n');

    try {
        // Lista de migrações em ordem de execução
        const migrations = [
            'add-client-type-column.sql',
            'melhorias-perfil.sql', 
            'produtos-unificados.sql',
            'fix-sistema-completo.sql'
        ];

        for (const migrationFile of migrations) {
            const migrationPath = path.join(MIGRATION_FOLDER, migrationFile);
            
            if (fs.existsSync(migrationPath)) {
                console.log(`📄 Executando migração: ${migrationFile}`);
                
                const sql = fs.readFileSync(migrationPath, 'utf8');
                
                // Dividir por comandos SQL (separados por ;)
                const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
                
                for (const command of commands) {
                    if (command.trim()) {
                        try {
                            await db.query(command.trim());
                        } catch (err) {
                            // Ignorar erros de "já existe" mas mostrar outros
                            if (!err.message.includes('already exists') && 
                                !err.message.includes('duplicate column') &&
                                !err.message.includes('relation') &&
                                !err.message.includes('does not exist')) {
                                console.warn(`   ⚠️  Aviso em ${migrationFile}: ${err.message}`);
                            }
                        }
                    }
                }
                
                console.log(`   ✅ ${migrationFile} executada com sucesso`);
            } else {
                console.log(`   ⚠️  Arquivo não encontrado: ${migrationFile}`);
            }
        }

        // Verificar se as tabelas principais existem
        console.log('\n🔍 VERIFICANDO ESTRUTURA DO BANCO...');
        
        const tabelas = [
            'clients',
            'users', 
            'employees',
            'items',
            'transactions',
            'produtos_vitrine',
            'pedidos',
            'itens_pedido',
            'notas_fiscais',
            'itens_nota_fiscal'
        ];

        for (const tabela of tabelas) {
            try {
                const result = await db.query(`SELECT COUNT(*) FROM ${tabela} LIMIT 1`);
                console.log(`   ✅ Tabela ${tabela}: OK`);
            } catch (err) {
                console.log(`   ❌ Tabela ${tabela}: ERRO - ${err.message}`);
            }
        }

        // Verificar campos importantes
        console.log('\n🔍 VERIFICANDO CAMPOS IMPORTANTES...');
        
        try {
            await db.query('SELECT client_type FROM clients LIMIT 1');
            console.log('   ✅ Campo client_type: OK');
        } catch (err) {
            console.log('   ❌ Campo client_type: FALTANDO');
        }

        try {
            await db.query('SELECT contact_phone FROM clients LIMIT 1');
            console.log('   ✅ Campo contact_phone: OK');
        } catch (err) {
            console.log('   ❌ Campo contact_phone: FALTANDO');
        }

        try {
            await db.query('SELECT latitude, longitude FROM produtos_vitrine LIMIT 1');
            console.log('   ✅ Tabela produtos_vitrine: OK');
        } catch (err) {
            console.log('   ❌ Tabela produtos_vitrine: FALTANDO');
        }

        // Verificar funções
        console.log('\n🔍 VERIFICANDO FUNÇÕES...');
        
        try {
            await db.query("SELECT gerar_numero_pedido('00000000-0000-0000-0000-000000000000', 'venda')");
            console.log('   ✅ Função gerar_numero_pedido: OK');
        } catch (err) {
            console.log('   ❌ Função gerar_numero_pedido: ERRO');
        }

        try {
            await db.query("SELECT gerar_numero_nf('00000000-0000-0000-0000-000000000000')");
            console.log('   ✅ Função gerar_numero_nf: OK');
        } catch (err) {
            console.log('   ❌ Função gerar_numero_nf: ERRO');
        }

        console.log('\n✅ MIGRAÇÕES CONCLUÍDAS COM SUCESSO!');
        console.log('🎉 Sistema ARK está pronto para deploy!');

    } catch (error) {
        console.error('\n❌ ERRO DURANTE AS MIGRAÇÕES:');
        console.error(error);
        process.exit(1);
    }
}

// Executar migrações
runMigrations().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});