require('dotenv').config();
const db = require('./src/config/db');

async function addTrialColumn() {
    try {
        console.log('🔧 Adicionando coluna trial_ends_at...');
        
        await db.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP');
        
        console.log('✅ Coluna trial_ends_at adicionada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

addTrialColumn();