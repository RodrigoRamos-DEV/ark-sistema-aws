require('dotenv').config();
const db = require('./src/config/db');

async function addExpiresColumn() {
    try {
        console.log('🔧 Adicionando coluna expires_at...');
        
        await db.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP');
        
        console.log('✅ Coluna expires_at adicionada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

addExpiresColumn();