require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../src/config/db');

// --- CONFIGURAÇÃO ---
const CLIENT_ID = '198f888a-1376-4228-906a-5c45af912633'; 
const DATA_FOLDER = path.join(__dirname, 'data');
// --------------------


const parseCurrency = (value) => {
    if (!value) return 0;
    const number = Number(String(value).replace(/\R\$\s?/, '').replace(/\./g, '').replace(',', '.'));
    return isNaN(number) ? 0 : number;
};

const parseDate = (dateString) => {
    if (!dateString || dateString.trim() === '') return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
};

async function migrate() {
    console.log('--- INICIANDO MIGRAÇÃO DE DADOS ---');
    console.log(`Cliente de Destino ID: ${CLIENT_ID}`);

    try {
        console.log('\n[ETAPA 1/2] Migrando cadastros do ficheiro DADOS.csv...');
        const dadosFilePath = path.join(DATA_FOLDER, 'DADOS.csv');
        const itemsToInsert = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(dadosFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.PRODUTO && row.PRODUTO.trim()) itemsToInsert.push({ name: row.PRODUTO.trim(), type: 'produto' });
                    if (row.COMPRADOR && row.COMPRADOR.trim()) itemsToInsert.push({ name: row.COMPRADOR.trim(), type: 'comprador' });
                    if (row.GASTOS && row.GASTOS.trim()) itemsToInsert.push({ name: row.GASTOS.trim(), type: 'compra' });
                    if (row.FORNECEDOR && row.FORNECEDOR.trim()) itemsToInsert.push({ name: row.FORNECEDOR.trim(), type: 'fornecedor' });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        for (const item of itemsToInsert) {
            await db.query(
                'INSERT INTO items (client_id, name, type) VALUES ($1, $2, $3) ON CONFLICT (client_id, type, name) DO NOTHING',
                [CLIENT_ID, item.name, item.type]
            );
        }
        console.log(`${itemsToInsert.length} itens de cadastro processados.`);

        console.log('\n[ETAPA 2/2] Migrando funcionários e lançamentos...');
        const files = fs.readdirSync(DATA_FOLDER);
        const employeeFiles = files.filter(f => f.toLowerCase() !== 'dados.csv' && f.toLowerCase() !== 'usuarios.csv' && f.toLowerCase() !== 'modelo.csv');
        
        console.log(`Encontrados ${employeeFiles.length} ficheiros de funcionários para processar...`);

        for (const fileName of employeeFiles) {
            const employeeName = path.parse(fileName).name;
            console.log(`\nProcessando funcionário: ${employeeName.toUpperCase()}`);

            const empResult = await db.query(
                'INSERT INTO employees (client_id, name) VALUES ($1, $2) ON CONFLICT (client_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                [CLIENT_ID, employeeName]
            );
            const employeeId = empResult.rows[0].id;

            const employeeFilePath = path.join(DATA_FOLDER, fileName);
            let transactionsCount = 0;
            
            const transactionsToInsert = [];
            await new Promise((resolve, reject) => {
                // Configuração do csv-parser para lidar com cabeçalhos duplicados
                fs.createReadStream(employeeFilePath)
                    .pipe(csv({
                        mapHeaders: ({ header, index }) => {
                            const baseHeader = header.trim();
                            // Colunas de 0 a 6 são de Vendas. Colunas de 8 em diante são de Gastos.
                            const isExpenseColumn = index >= 8; 
                            if (isExpenseColumn) {
                                return `${baseHeader}_GASTO`;
                            }
                            return baseHeader;
                        }
                    }))
                    .on('data', (row) => {
                        // --- LÓGICA DE LEITURA CORRIGIDA ---
                        // Agora verifica a Venda e o Gasto em duas etapas separadas
                        
                        // Etapa 1: Verifica se há uma Venda na linha
                        if (row.DATA && row.PRODUTO) {
                            transactionsToInsert.push({
                                type: 'venda',
                                date: parseDate(row.DATA),
                                description: row.PRODUTO,
                                category: row.COMPRADOR,
                                qty: parseFloat(row.QUANTIDADE) || 0,
                                unit: parseCurrency(row.VALOR),
                                total: parseCurrency(row['VALOR TOTAL']),
                                status: row.STATUS
                            });
                        }
                        
                        // Etapa 2: Verifica se há um Gasto na mesma linha
                        if (row.DATA_GASTO && row.COMPRA_GASTO) {
                           transactionsToInsert.push({
                                type: 'gasto',
                                date: parseDate(row.DATA_GASTO),
                                description: row.COMPRA_GASTO,
                                category: row.FORNECEDOR_GASTO,
                                qty: parseFloat(row.QUANTIDADE_GASTO) || 0,
                                unit: parseCurrency(row.VALOR_GASTO),
                                total: parseCurrency(row['VALOR TOTAL_GASTO']),
                                status: row.STATUS_GASTO
                            });
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            for(const trx of transactionsToInsert) {
                if(trx.date) {
                    await db.query(
                        `INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                        [CLIENT_ID, employeeId, trx.type, trx.date, trx.description, trx.category, trx.qty, trx.unit, trx.total, trx.status]
                    );
                    transactionsCount++;
                }
            }
             console.log(`${transactionsCount} lançamentos importados para ${employeeName.toUpperCase()}.`);
        }
        
        console.log('\n--- MIGRAÇÃO CONCLUÍDA COM SUCESSO! ---');
        process.exit(0);

    } catch (error) {
        console.error('\n--- OCORREU UM ERRO DURANTE A MIGRAÇÃO ---');
        console.error(error);
        process.exit(1);
    }
}

migrate();