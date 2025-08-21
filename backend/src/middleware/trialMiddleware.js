const db = require('../config/db');

const checkTrialStatus = async (req, res, next) => {
    try {
        // Verificar se req.user existe
        if (!req.user) {
            return res.status(401).json({ msg: 'Usuário não autenticado.' });
        }

        // Permitir acesso para admins
        if (req.user.role === 'admin') {
            return next();
        }

        // Verificar se clientId existe
        if (!req.user.clientId) {
            return res.status(403).json({ msg: 'Cliente não identificado.' });
        }

        // Buscar informações do cliente
        const clientResult = await db.query(
            'SELECT license_expires_at, license_status FROM clients WHERE id = $1',
            [req.user.clientId]
        );

        if (clientResult.rows.length === 0) {
            return res.status(403).json({ msg: 'Cliente não encontrado.' });
        }

        const client = clientResult.rows[0];
        
        // Se o status for "Trial Expirado", bloquear acesso a funcionalidades de escrita
        if (client.license_status === 'Trial Expirado') {
            // Permitir apenas rotas de leitura (GET) e algumas específicas
            const allowedMethods = ['GET'];
            const allowedPaths = ['/api/auth/logout', '/api/profile'];
            
            if (!allowedMethods.includes(req.method) && !allowedPaths.includes(req.path)) {
                return res.status(403).json({ 
                    msg: 'Trial expirado. Entre em contato para renovar sua licença.',
                    trialExpired: true,
                    whatsapp: '+55 21 97304-4415'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de trial:', error);
        res.status(500).json({ msg: 'Erro interno do servidor.' });
    }
};

module.exports = { checkTrialStatus };