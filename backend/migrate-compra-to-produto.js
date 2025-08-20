const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco:', err.message);
        return;
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Migração: alterar todos os itens do tipo 'compra' para 'produto'
db.run(`UPDATE items SET type = 'produto' WHERE type = 'compra'`, function(err) {
    if (err) {
        console.error('Erro na migração:', err.message);
        return;
    }
    console.log(`Migração concluída! ${this.changes} registros alterados de 'compra' para 'produto'.`);
    
    // Verificar o resultado
    db.all(`SELECT COUNT(*) as total FROM items WHERE type = 'produto'`, (err, rows) => {
        if (err) {
            console.error('Erro ao verificar:', err.message);
            return;
        }
        console.log(`Total de produtos após migração: ${rows[0].total}`);
        
        // Fechar conexão
        db.close((err) => {
            if (err) {
                console.error('Erro ao fechar banco:', err.message);
                return;
            }
            console.log('Conexão com banco fechada.');
        });
    });
});