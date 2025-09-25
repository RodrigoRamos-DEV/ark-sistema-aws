const db = require('../config/db');

// Atualizar status online do usuário
exports.updateOnlineStatus = async (req, res) => {
    try {
        console.log('Heartbeat request - user:', req.user);
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        if (!userId) {
            console.log('Heartbeat error: Usuário não identificado', req.user);
            return res.status(400).json({ msg: 'Usuário não identificado.' });
        }

        // Para admin, não salvar status online (evita foreign key constraint)
        if (userRole === 'admin') {
            return res.json({ msg: 'Status atualizado (admin)' });
        }

        // Inserir ou atualizar status na tabela online_status
        try {
            await db.query(`
                INSERT INTO online_status (user_id, is_online, last_seen, updated_at) 
                VALUES ($1, true, NOW(), NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET is_online = true, last_seen = NOW(), updated_at = NOW()
            `, [userId]);
        } catch (dbError) {
            console.error('Erro na query do heartbeat:', dbError);
        }

        res.json({ msg: 'Status atualizado' });
    } catch (error) {
        console.error('Erro ao atualizar status online:', error);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
};

// Remover usuário do status online (logout)
exports.removeOnlineStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (userId) {
            await db.query(
                'UPDATE online_status SET is_online = false, last_seen = NOW(), updated_at = NOW() WHERE user_id = $1', 
                [userId]
            );
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
        // Marcar como offline usuários inativos (mais de 3 minutos)
        await db.query(`
            UPDATE online_status 
            SET is_online = false, updated_at = NOW() 
            WHERE last_seen < NOW() - INTERVAL '3 minutes' AND is_online = true
        `);
        
        // Buscar clientes com status online
        const result = await db.query(`
            SELECT 
                c.id,
                c.company_name,
                os.last_seen,
                COALESCE(os.is_online, false) as is_online
            FROM clients c
            LEFT JOIN users u ON u.client_id = c.id
            LEFT JOIN online_status os ON os.user_id = u.id::varchar
            ORDER BY c.company_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar status online:', error);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
};

module.exports = exports;