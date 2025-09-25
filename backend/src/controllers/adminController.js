const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ensureAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'funcionario') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

const getAllClients = async (req, res) => {
    try {
        const { search, sortBy, sortOrder, filterPlan, filterStatus } = req.query;
        
        let whereClause = '';
        let orderClause = 'ORDER BY c.company_name ASC';
        const queryParams = [];
        
        // Busca por nome ou email
        if (search) {
            whereClause = 'WHERE (LOWER(c.company_name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))';
            queryParams.push(`%${search}%`);
        }
        
        // Filtro por plano
        if (filterPlan) {
            const planFilter = whereClause ? ' AND ' : ' WHERE ';
            whereClause += `${planFilter}COALESCE(s.plan, 'free') = $${queryParams.length + 1}`;
            queryParams.push(filterPlan);
        }
        
        // Filtro por status
        if (filterStatus) {
            const statusFilter = whereClause ? ' AND ' : ' WHERE ';
            if (filterStatus === 'online') {
                whereClause += `${statusFilter}COALESCE(os.is_online, false) = true`;
            } else {
                whereClause += `${statusFilter}COALESCE(s.status, 'active') = $${queryParams.length + 1}`;
                queryParams.push(filterStatus);
            }
        }
        
        // Ordenação
        if (sortBy) {
            const validSorts = {
                'name': 'c.company_name',
                'email': 'u.email',
                'expires': 'c.license_expires_at',
                'plan': 's.plan',
                'status': 's.status'
            };
            
            if (validSorts[sortBy]) {
                const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';
                orderClause = `ORDER BY ${validSorts[sortBy]} ${direction}`;
            }
        }
        
        const finalQuery = `
            SELECT 
                c.id, c.company_name, c.razao_social, c.cnpj, c.inscricao_estadual,
                c.inscricao_municipal, c.responsavel_nome, c.business_phone,
                c.endereco_logradouro, c.endereco_numero, c.endereco_bairro,
                c.endereco_cidade, c.endereco_uf, c.endereco_cep,
                c.regime_tributario, c.license_expires_at, c.vendedor_id,
                COALESCE(c.client_type, 'produtor') as client_type,
                COALESCE(v.name, 'N/A') as partner_name,
                CASE
                    WHEN c.license_expires_at < CURRENT_DATE THEN 'Vencido'
                    WHEN c.license_expires_at - CURRENT_DATE <= 5 THEN 'A Vencer'
                    ELSE 'Ativo'
                END AS license_status,
                u.email,
                COALESCE(s.plan, 'free') as subscription_plan,
                COALESCE(s.status, 'active') as subscription_status,
                s.trial_ends_at,
                s.expires_at as subscription_expires_at,
                COALESCE(os.is_online, false) as is_online,
                os.last_seen
            FROM clients c
            LEFT JOIN vendedores v ON c.vendedor_id = v.id
            LEFT JOIN users u ON u.client_id = c.id
            LEFT JOIN subscriptions s ON s.user_id = u.id::varchar
            LEFT JOIN online_status os ON os.user_id = u.id::varchar
            ${whereClause}
            ${orderClause}
        `;
        
        console.log('Query:', finalQuery);
        console.log('Params:', queryParams);
        
        const result = await db.query(finalQuery, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro detalhado:', err);
        console.error('Query que falhou:', finalQuery);
        console.error('Parâmetros:', queryParams);
        res.status(500).json({ error: 'Erro no servidor ao buscar clientes.', details: err.message });
    }
};

const createClient = async (req, res) => {
    const { 
        companyName, razao_social, cnpj, inscricao_estadual, inscricao_municipal,
        responsavel_nome, email, telefone, endereco_logradouro, endereco_numero,
        endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
        regime_tributario, licenseExpiresAt, vendedorId, clientType
    } = req.body;

    if (!companyName || !licenseExpiresAt || !razao_social || !responsavel_nome || !telefone) {
        return res.status(400).json({ error: 'Nome da empresa, Razão Social, Responsável, Telefone e Data de Vencimento são obrigatórios.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const newClientResult = await client.query(
            `INSERT INTO clients (
                company_name, razao_social, cnpj, inscricao_estadual, inscricao_municipal,
                responsavel_nome, email, business_phone, endereco_logradouro, endereco_numero,
                endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
                regime_tributario, license_expires_at, license_status, vendedor_id, client_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Ativo', $17, $18) RETURNING id`,
            [
                companyName, razao_social, cnpj || null, inscricao_estadual, inscricao_municipal,
                responsavel_nome, email, telefone, endereco_logradouro, endereco_numero,
                endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
                regime_tributario, licenseExpiresAt, vendedorId || null, clientType || 'produtor'
            ]
        );
        const newClientId = newClientResult.rows[0].id;
        const registrationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await client.query(
            'INSERT INTO registration_tokens (client_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [newClientId, registrationToken, expiresAt]
        );
        
        await client.query('COMMIT');
        res.status(201).json({ 
            msg: 'Cliente criado com sucesso! Envie o token abaixo para o cliente se registar.',
            registrationToken: registrationToken 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Este CNPJ já está cadastrado.' });
        }
        res.status(500).json({ error: 'Erro no servidor ao criar cliente.' });
    } finally {
        client.release();
    }
};

const updateClient = async (req, res) => {
    const { id } = req.params;
    const { 
        companyName, razao_social, cnpj, inscricao_estadual, inscricao_municipal,
        responsavel_nome, email, telefone, endereco_logradouro, endereco_numero,
        endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
        regime_tributario, licenseStatus, licenseExpiresAt, vendedorId, clientType
    } = req.body;
    
    try {
        // Atualizar cliente
        const result = await db.query(
            `UPDATE clients SET 
                company_name = $1, razao_social = $2, cnpj = $3, inscricao_estadual = $4, 
                inscricao_municipal = $5, responsavel_nome = $6, email = $7, business_phone = $8, 
                endereco_logradouro = $9, endereco_numero = $10, endereco_bairro = $11, 
                endereco_cidade = $12, endereco_uf = $13, endereco_cep = $14, 
                regime_tributario = $15, license_status = $16, license_expires_at = $17, vendedor_id = $18, client_type = $19 
            WHERE id = $20 RETURNING *`,
            [
                companyName, razao_social, cnpj || null, inscricao_estadual, inscricao_municipal,
                responsavel_nome, email, telefone, endereco_logradouro, endereco_numero,
                endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
                regime_tributario, licenseStatus, licenseExpiresAt, vendedorId || null, clientType || 'produtor', id
            ]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        
        // Atualizar também a tabela subscriptions com a nova data
        if (licenseExpiresAt) {
            const isExpired = new Date(licenseExpiresAt) < new Date();
            
            await db.query(
                `UPDATE subscriptions SET 
                    plan = $1, 
                    status = $2, 
                    expires_at = $3,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE user_id IN (
                    SELECT u.id::text FROM users u WHERE u.client_id = $4
                )`,
                [
                    isExpired ? 'free' : 'premium',
                    isExpired ? 'expired' : 'active', 
                    licenseExpiresAt,
                    id
                ]
            );
            
            console.log(`Subscription atualizada para cliente ${id}: expires_at = ${licenseExpiresAt}`);
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao atualizar cliente.' });
    }
};

const deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ msg: 'Cliente e todos os seus dados foram deletados com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao deletar cliente.' });
    }
};

const renewClientLicense = async (req, res) => {
    const { id } = req.params;
    try {
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
        const result = await db.query( "UPDATE clients SET license_status = 'Ativo', license_expires_at = $1 WHERE id = $2 RETURNING *", [newExpiresAt, id] );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.json({ msg: 'Licença do cliente renovada com sucesso!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao renovar a licença.' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const statusQuery = `
            SELECT 
                COUNT(DISTINCT c.id) AS total_clients,
                COUNT(*) FILTER (WHERE s.plan = 'premium' AND s.status = 'active') AS premium,
                COUNT(*) FILTER (WHERE s.plan = 'free' OR s.plan IS NULL) AS free
            FROM clients c
            LEFT JOIN users u ON u.client_id = c.id
            LEFT JOIN subscriptions s ON s.user_id = u.id::text;
        `;
        const renewalsQuery = `
            SELECT id, company_name, license_expires_at
            FROM clients
            WHERE license_expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
            ORDER BY license_expires_at ASC;
        `;
        const monthlyGrowthQuery = `
            SELECT 
                to_char(created_at, 'YYYY-MM') as month,
                COUNT(*) as new_clients
            FROM clients
            WHERE created_at > NOW() - INTERVAL '12 months'
            GROUP BY month
            ORDER BY month ASC;
        `;
        
        const [statusResult, renewalsResult, growthResult] = await Promise.all([
            db.query(statusQuery),
            db.query(renewalsQuery),
            db.query(monthlyGrowthQuery)
        ]);

        res.json({
            summary: statusResult.rows[0],
            upcomingRenewals: renewalsResult.rows,
            monthlyGrowth: growthResult.rows
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar dados do dashboard.' });
    }
};

const saveReportTemplate = async (req, res) => {
    const { name, clientId, templateJson, templateHtml } = req.body;

    if (!name || !templateJson || !templateHtml) {
        return res.status(400).json({ error: "Nome, JSON e HTML do template são obrigatórios." });
    }

    try {
        await db.query(
            `INSERT INTO report_templates (name, client_id, template_json, template_html)
             VALUES ($1, $2, $3, $4)`,
            [name, clientId || null, templateJson, templateHtml]
        );
        res.status(201).json({ msg: 'Template salvo com sucesso!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao salvar o template.' });
    }
};

const getClientToken = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'SELECT token_hash FROM registration_tokens WHERE client_id = $1 AND expires_at > NOW() LIMIT 1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Token não encontrado ou expirado.' });
        }
        res.json({ registrationToken: result.rows[0].token_hash });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar token.' });
    }
};

const getClientProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'SELECT contact_phone FROM clients WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.json({ contact_phone: result.rows[0].contact_phone });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar perfil.' });
    }
};

const getUserProfile = async (req, res) => {
    const { id } = req.params;
    try {
        // Buscar dados do cliente (perfil)
        const clientResult = await db.query(
            `SELECT contact_phone, cep, endereco_rua, endereco_numero, 
                    endereco_bairro, endereco_cidade, endereco_uf 
             FROM clients WHERE id = $1`,
            [id]
        );
        
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        
        const client = clientResult.rows[0];
        console.log('Dados do cliente encontrado:', {
            contact_phone: client.contact_phone,
            cep: client.cep,
            endereco_rua: client.endereco_rua,
            endereco_numero: client.endereco_numero,
            endereco_bairro: client.endereco_bairro,
            endereco_cidade: client.endereco_cidade,
            endereco_uf: client.endereco_uf
        });
        
        res.json({
            whatsapp: client.contact_phone,
            contact_phone: client.contact_phone,
            cep: client.cep,
            endereco: client.endereco_rua,
            numero: client.endereco_numero,
            bairro: client.endereco_bairro,
            cidade: client.endereco_cidade,
            uf: client.endereco_uf
        });
    } catch (err) {
        console.error('Erro ao buscar perfil do cliente:', err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar perfil do cliente.' });
    }
};

const renewSubscription = async (req, res) => {
    const { id } = req.params;
    try {
        // Buscar user_id do cliente
        const userResult = await db.query('SELECT id FROM users WHERE client_id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado para este cliente.' });
        }
        
        const userId = userResult.rows[0].id;
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
        
        // Converter userId para string (subscriptions usa VARCHAR)
        const userIdStr = userId.toString();
        
        // Atualizar assinatura (ou criar se não existir)
        const updateResult = await db.query(
            'UPDATE subscriptions SET plan = $1, status = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
            ['premium', 'active', newExpiresAt, userIdStr]
        );
        
        // Se não atualizou nenhuma linha, criar nova assinatura
        if (updateResult.rowCount === 0) {
            await db.query(
                'INSERT INTO subscriptions (user_id, plan, status, expires_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [userIdStr, 'premium', 'active', newExpiresAt]
            );
        }
        
        // Também atualizar a data de vencimento da licença do cliente
        await db.query(
            'UPDATE clients SET license_expires_at = $1, license_status = $2 WHERE id = $3',
            [newExpiresAt, 'Ativo', id]
        );
        
        res.json({ msg: 'Assinatura e licença renovadas com sucesso por 30 dias!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao renovar assinatura.' });
    }
};

const getNotifications = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar notificações.' });
    }
};

const createNotification = async (req, res) => {
    const { title, message, type, target_audience } = req.body;
    
    if (!title || !message) {
        return res.status(400).json({ error: 'Título e mensagem são obrigatórios.' });
    }
    
    try {
        const result = await db.query(
            'INSERT INTO notifications (title, message, type, target_audience) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, message, type || 'info', target_audience || 'all']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao criar notificação.' });
    }
};

const deleteNotification = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM notifications WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Notificação não encontrada.' });
        }
        res.json({ msg: 'Notificação removida com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao remover notificação.' });
    }
};

module.exports = {
    ensureAdmin,
    getAllClients,
    createClient,
    updateClient,
    deleteClient,
    renewClientLicense,
    getDashboardStats,
    saveReportTemplate,
    getClientToken,
    getClientProfile,
    getUserProfile,
    renewSubscription,
    getNotifications,
    createNotification,
    deleteNotification
};