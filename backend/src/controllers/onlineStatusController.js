const db = require('../config/db');

// Atualizar status online do usuário
exports.updateOnlineStatus = async (req, res) => {
    try {
        const clientId = req.user.clientId;
        
        if (!clientId) {
            return res.status(400).json({ msg: 'Cliente não identificado.' });
        }

        // Criar tabela se não existir
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_online_status (
                client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
                last_activity TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Inserir ou atualizar status
        await db.query(`
            INSERT INTO user_online_status (client_id, last_activity, updated_at) 
            VALUES ($1, NOW(), NOW())
            ON CONFLICT (client_id) 
            DO UPDATE SET last_activity = NOW(), updated_at = NOW()
        `, [clientId]);

        res.json({ msg: 'Status atualizado' });
    } catch (error) {
        console.error('Erro ao atualizar status online:', error);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
};

// Remover usuário do status online (logout)
exports.removeOnlineStatus = async (req, res) => {
    try {
        const clientId = req.user.clientId;
        
        if (clientId) {
            await db.query('DELETE FROM user_online_status WHERE client_id = $1', [clientId]);
        }

        res.json({ msg: 'Status removido' });
    } catch (error) {
        console.error('Erro ao remover status online:', error);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
};

// Buscar status online de todos os clientes
exports.getOnlineStatus = async (req, res) => {
    try {
        // Limpar registros antigos (mais de 5 minutos)
        await db.query('DELETE FROM user_online_status WHERE last_activity < NOW() - INTERVAL \'5 minutes\'');
        
        // Buscar clientes com status online
        const result = await db.query(`
            SELECT 
                c.id,
                c.company_name,
                uos.last_activity,
                CASE 
                    WHEN uos.last_activity > NOW() - INTERVAL '3 minutes' THEN true
                    ELSE false
                END as is_online
            FROM clients c
            LEFT JOIN user_online_status uos ON c.id = uos.client_id
            ORDER BY c.company_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar status online:', error);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
};

module.exports = exports;