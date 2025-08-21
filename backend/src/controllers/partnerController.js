const db = require('../config/db');

// Busca todos os vendedores
exports.getPartners = async (req, res) => {
    console.log('[PARTNERS] Iniciando busca de vendedores...');
    try {
        // Criar tabelas se não existirem
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_vendors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
                vendedor_id TEXT NOT NULL,
                porcentagem DECIMAL(5,2) NOT NULL,
                valor_comissao DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
                id SERIAL PRIMARY KEY,
                vendedor_id INTEGER,
                mes_referencia VARCHAR(7),
                valor_comissao DECIMAL(12,2) DEFAULT 0,
                data_pagamento DATE,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS comissoes_vendedores (
                id SERIAL PRIMARY KEY,
                vendedor_id INTEGER,
                cliente_id UUID,
                transaction_id UUID,
                valor_venda DECIMAL(12,2) DEFAULT 0,
                valor_vendedor DECIMAL(12,2) DEFAULT 0,
                mes_referencia VARCHAR(7),
                data_venda DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('[PARTNERS] Executando query SELECT vendedores...');
        const vendedores = await db.query('SELECT * FROM vendedores ORDER BY name');
        console.log(`[PARTNERS] Encontrados ${vendedores.rows.length} vendedores`);
        res.json(vendedores.rows);
    } catch (err) {
        console.error('Erro ao buscar vendedores:', err.message);
        res.status(500).json({ error: 'Erro ao buscar vendedores: ' + err.message });
    }
};

// Criar novo vendedor
exports.createVendedor = async (req, res) => {
    console.log('[CREATE_VENDEDOR] Dados recebidos:', req.body);
    
    const { name, porcentagem, pix, endereco, telefone } = req.body;
    if (!name || !porcentagem) {
        console.log('[CREATE_VENDEDOR] Dados obrigatórios ausentes');
        return res.status(400).json({ error: 'Nome e porcentagem são obrigatórios.' });
    }
    
    try {
        const pct = Math.min(Math.max(parseFloat(porcentagem) || 0, 0), 99.99);
        console.log(`[CREATE_VENDEDOR] Inserindo vendedor: ${name}, porcentagem: ${pct}`);
        
        const result = await db.query(
            'INSERT INTO vendedores (name, porcentagem, pix, endereco, telefone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, pct, pix || '', endereco || '', telefone || '']
        );
        
        console.log('[CREATE_VENDEDOR] Vendedor criado com sucesso:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[CREATE_VENDEDOR] Erro ao criar vendedor:', err.message);
        console.error('[CREATE_VENDEDOR] Stack:', err.stack);
        res.status(500).json({ error: 'Erro ao criar vendedor: ' + err.message });
    }
};

// Atualizar vendedor
exports.updateVendedor = async (req, res) => {
    const { id } = req.params;
    const { name, porcentagem, pix, endereco, telefone } = req.body;
    try {
        const pct = Math.min(Math.max(parseFloat(porcentagem) || 0, 0), 99.99);
        const result = await db.query(
            'UPDATE vendedores SET name = $1, porcentagem = $2, pix = $3, endereco = $4, telefone = $5 WHERE id = $6 RETURNING *',
            [name, pct, pix || '', endereco || '', telefone || '', id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Vendedor não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar vendedor:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar vendedor: ' + err.message });
    }
};

// Excluir vendedor
exports.deleteVendedor = async (req, res) => {
    const { id } = req.params;
    try {
        // Verificar se vendedor tem clientes associados
        const clientsResult = await db.query('SELECT COUNT(*) as count FROM clients WHERE vendedor_id = $1', [id]);
        const clientCount = parseInt(clientsResult.rows[0].count);
        
        if (clientCount > 0) {
            return res.status(400).json({ 
                error: `Não é possível excluir este vendedor pois ele possui ${clientCount} cliente(s) associado(s). Remova os clientes primeiro.` 
            });
        }
        
        const result = await db.query('DELETE FROM vendedores WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Vendedor não encontrado.' });
        }
        res.json({ msg: 'Vendedor excluído com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao excluir vendedor.' });
    }
};

// Buscar comissões dos vendedores (versão que funciona sem tabelas novas)
exports.getComissoes = async (req, res) => {
    const { mes } = req.query;
    const mesRef = mes || new Date().toISOString().slice(0, 7);
    
    try {
        // Criar tabela payment_vendors se não existir
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_vendors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL,
                vendedor_id TEXT NOT NULL,
                porcentagem DECIMAL(5,2) NOT NULL,
                valor_comissao DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Agora usar a tabela normalmente
        const result = await db.query(`
            SELECT 
                v.id as vendedor_id,
                v.name as vendedor_nome,
                v.porcentagem,
                v.pix,
                (
                    SELECT COALESCE(SUM(pv2.valor_comissao), 0)
                    FROM payment_vendors pv2
                    JOIN payments p2 ON pv2.payment_id = p2.id
                    WHERE CAST(v.id AS TEXT) = pv2.vendedor_id
                    AND TO_CHAR(p2.payment_date, 'YYYY-MM') = $1
                ) as total_comissao,
                (
                    SELECT COUNT(*)
                    FROM payment_vendors pv3
                    JOIN payments p3 ON pv3.payment_id = p3.id
                    WHERE CAST(v.id AS TEXT) = pv3.vendedor_id
                    AND TO_CHAR(p3.payment_date, 'YYYY-MM') = $1
                ) as total_pagamentos,
                (
                    SELECT CASE 
                        WHEN COUNT(CASE WHEN pv4.status = 'pago' THEN 1 END) = COUNT(*) AND COUNT(*) > 0 THEN 'pago'
                        ELSE 'pendente'
                    END
                    FROM payment_vendors pv4
                    JOIN payments p4 ON pv4.payment_id = p4.id
                    WHERE CAST(v.id AS TEXT) = pv4.vendedor_id
                    AND TO_CHAR(p4.payment_date, 'YYYY-MM') = $1
                ) as status_pagamento
            FROM vendedores v
            ORDER BY v.name
        `, [mesRef]);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar comissões:', err.message);
        // Fallback para versão simples em caso de erro
        try {
            const result = await db.query(`
                SELECT 
                    v.id as vendedor_id,
                    v.name as vendedor_nome,
                    v.porcentagem,
                    v.pix,
                    0 as total_comissao,
                    0 as total_pagamentos,
                    'pendente' as status_pagamento
                FROM vendedores v
                ORDER BY v.name
            `);
            res.json(result.rows);
        } catch (fallbackErr) {
            res.status(500).json({ error: 'Erro ao buscar comissões: ' + fallbackErr.message });
        }
    }
};

// Marcar comissão como paga e criar retirada automaticamente
exports.marcarComissaoPaga = async (req, res) => {
    const { vendedor_id, mes_referencia } = req.body;
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Criar tabela se não existir
        await client.query(`
            CREATE TABLE IF NOT EXISTS payment_vendors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL,
                vendedor_id TEXT NOT NULL,
                porcentagem DECIMAL(5,2) NOT NULL,
                valor_comissao DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Buscar comissões pendentes do vendedor no mês
        const comissoes = await client.query(`
            SELECT pv.*, v.name as vendedor_nome
            FROM payment_vendors pv
            JOIN payments p ON pv.payment_id = p.id
            JOIN vendedores v ON CAST(v.id AS TEXT) = pv.vendedor_id
            WHERE pv.vendedor_id = $1 
            AND TO_CHAR(p.payment_date, 'YYYY-MM') = $2
            AND pv.status = 'pendente'
        `, [vendedor_id, mes_referencia]);
        
        if (comissoes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Nenhuma comissão pendente encontrada.' });
        }
        
        // Calcular total das comissões
        const totalComissao = comissoes.rows.reduce((sum, c) => sum + parseFloat(c.valor_comissao), 0);
        const vendedorNome = comissoes.rows[0].vendedor_nome;
        
        console.log(`Criando UMA retirada para ${vendedorNome}: ${totalComissao} (${comissoes.rows.length} comissões)`);
        
        // Verificar se já existe retirada para este vendedor hoje
        const existingWithdrawal = await client.query(`
            SELECT id FROM withdrawals 
            WHERE partner_id = $1 
            AND withdrawal_date = CURRENT_DATE 
            AND amount = $2
        `, [vendedor_id, totalComissao]);
        
        if (existingWithdrawal.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Retirada já existe para este vendedor hoje.' });
        }
        
        // Criar UMA Única retirada com o valor total
        const withdrawal = await client.query(`
            INSERT INTO withdrawals (partner_id, amount, withdrawal_date)
            VALUES ($1, $2, CURRENT_DATE)
            RETURNING *
        `, [vendedor_id, totalComissao]);
        
        // Marcar TODAS as comissões como pagas
        const updateResult = await client.query(`
            UPDATE payment_vendors 
            SET status = 'pago'
            WHERE vendedor_id = $1 
            AND payment_id IN (
                SELECT p.id FROM payments p 
                WHERE TO_CHAR(p.payment_date, 'YYYY-MM') = $2
            )
            AND status = 'pendente'
        `, [vendedor_id, mes_referencia]);
        
        console.log(`Marcadas ${updateResult.rowCount} comissões como pagas`);
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            withdrawal: withdrawal.rows[0],
            total_comissao: totalComissao,
            comissoes_pagas: comissoes.rows.length
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao marcar pagamento:', err.message);
        res.status(500).json({ error: 'Erro ao marcar pagamento: ' + err.message });
    } finally {
        client.release();
    }
};

// Marcar comissão como pendente
exports.marcarComissaoPendente = async (req, res) => {
    const { vendedor_id, mes_referencia } = req.body;
    
    try {
        // Marcar comissões como pendentes
        await db.query(`
            UPDATE payment_vendors 
            SET status = 'pendente'
            WHERE vendedor_id = $1 
            AND payment_id IN (
                SELECT p.id FROM payments p 
                WHERE TO_CHAR(p.payment_date, 'YYYY-MM') = $2
            )
        `, [vendedor_id, mes_referencia]);
        
        // Excluir retirada relacionada (se existir)
        await db.query(`
            DELETE FROM withdrawals 
            WHERE partner_id = $1 
            AND withdrawal_date >= $2::date 
            AND withdrawal_date < ($2::date + INTERVAL '1 month')
        `, [vendedor_id, mes_referencia + '-01']);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao marcar como pendente:', err.message);
        res.status(500).json({ error: 'Erro ao alterar status: ' + err.message });
    }
};

// Buscar status de pagamentos
exports.getStatusPagamentos = async (req, res) => {
    const { mes } = req.query;
    const mesRef = mes || new Date().toISOString().slice(0, 7);
    
    try {
        // Criar tabela se não existir
        await db.query(`
            CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
                id SERIAL PRIMARY KEY,
                vendedor_id INTEGER,
                mes_referencia VARCHAR(7),
                valor_comissao DECIMAL(12,2),
                data_pagamento DATE,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(vendedor_id, mes_referencia)
            )
        `);
        
        const result = await db.query(`
            SELECT vendedor_id, status, data_pagamento, valor_comissao
            FROM pagamentos_comissoes
            WHERE mes_referencia = $1
        `, [mesRef]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao buscar status.' });
    }
};

// Busca todos os pagamentos com filtro de data
exports.getPayments = async (req, res) => {
    const { startDate, endDate } = req.query;
    
    let queryText = `
        SELECT p.*, c.company_name 
        FROM payments p
        JOIN clients c ON p.client_id = c.id
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (startDate) {
        queryText += ` WHERE p.payment_date >= $${paramIndex++}`;
        queryParams.push(startDate);
    }
    if (endDate) {
        queryText += startDate ? ` AND p.payment_date <= $${paramIndex++}` : ` WHERE p.payment_date <= $${paramIndex++}`;
        queryParams.push(endDate);
    }
    
    queryText += ' ORDER BY p.payment_date DESC';

    try {
        const payments = await db.query(queryText, queryParams);
        res.json(payments.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
    }
};

// Adiciona um novo pagamento de cliente com comissões
exports.addPayment = async (req, res) => {
    const { clientId, amount, paymentDate, notes, vendedores } = req.body;
    if (!clientId || !amount || !paymentDate) {
        return res.status(400).json({ error: 'Cliente, valor e data são obrigatórios.' });
    }
    
    try {
        // Primeiro, garantir que a tabela existe
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_vendors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
                vendedor_id TEXT NOT NULL,
                porcentagem DECIMAL(5,2) NOT NULL,
                valor_comissao DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Adicionar pagamento
        const newPayment = await db.query(
            'INSERT INTO payments (client_id, amount, payment_date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [clientId, amount, paymentDate, notes]
        );
        
        const paymentId = newPayment.rows[0].id;
        console.log('Pagamento criado:', paymentId);
        console.log('Vendedores recebidos:', vendedores);
        
        // Salvar comissões dos vendedores
        if (vendedores && vendedores.length > 0) {
            for (const vendedor of vendedores) {
                if (vendedor.vendedor_id && vendedor.porcentagem) {
                    const valorComissao = (parseFloat(amount) * parseFloat(vendedor.porcentagem)) / 100;
                    console.log(`Salvando comissão: Vendedor ${vendedor.vendedor_id}, ${vendedor.porcentagem}%, Valor: ${valorComissao}`);
                    
                    await db.query(`
                        INSERT INTO payment_vendors (payment_id, vendedor_id, porcentagem, valor_comissao)
                        VALUES ($1, $2, $3, $4)
                    `, [paymentId, vendedor.vendedor_id, vendedor.porcentagem, valorComissao]);
                }
            }
        }
        
        res.status(201).json(newPayment.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar pagamento:', err.message);
        res.status(500).json({ error: 'Erro ao adicionar pagamento: ' + err.message });
    }
};

// Edita um pagamento existente
exports.updatePayment = async (req, res) => {
    const { id } = req.params;
    const { amount, paymentDate, notes } = req.body;
    try {
        const result = await db.query(
            'UPDATE payments SET amount = $1, payment_date = $2, notes = $3 WHERE id = $4 RETURNING *',
            [amount, paymentDate, notes, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pagamento não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao atualizar o pagamento.' });
    }
};

// Exclui um pagamento
exports.deletePayment = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM payments WHERE id = $1', [id]);
        res.json({ msg: 'Pagamento excluído com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao excluir o pagamento.' });
    }
};

// Dashboard financeiro
exports.getDashboardFinanceiro = async (req, res) => {
    try {
        // Valores simples para teste
        const totalCaixa = 0;
        const lucroLiquido = 0;
        const aPagarVendedores = 0;
        const disponivelRetirada = 0;
        
        res.json({
            totalCaixa,
            lucroLiquido,
            aPagarVendedores,
            disponivelRetirada,
            vendedoresComissoes: []
        });
    } catch (err) {
        console.error('Erro no dashboard financeiro:', err.message);
        res.status(500).json({ error: 'Erro ao buscar dados financeiros: ' + err.message });
    }
};



// Reverter comissões quando retirada é excluída
exports.reverterRetirada = async (req, res) => {
    const { withdrawal_id } = req.body;
    try {
        // Buscar informações da retirada
        const withdrawal = await db.query('SELECT * FROM withdrawals WHERE id = $1', [withdrawal_id]);
        
        if (withdrawal.rows.length === 0) {
            return res.status(404).json({ error: 'Retirada não encontrada.' });
        }
        
        const partnerId = withdrawal.rows[0].partner_id;
        const withdrawalDate = withdrawal.rows[0].withdrawal_date;
        
        // Reverter comissões do vendedor para pendente
        const mesReferencia = new Date(withdrawalDate).toISOString().slice(0, 7);
        
        await db.query(`
            UPDATE payment_vendors 
            SET status = 'pendente'
            WHERE vendedor_id = $1 
            AND payment_id IN (
                SELECT p.id FROM payments p 
                WHERE TO_CHAR(p.payment_date, 'YYYY-MM') = $2
            )
            AND status = 'pago'
        `, [partnerId, mesReferencia]);
        
        console.log(`Comissões do vendedor ${partnerId} revertidas para pendente`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao reverter retirada:', err.message);
        res.status(500).json({ error: 'Erro ao reverter retirada: ' + err.message });
    }
};

// Limpar dados de teste
exports.limparDados = async (req, res) => {
    try {
        const result1 = await db.query('DELETE FROM payments');
        const result2 = await db.query('DELETE FROM withdrawals');
        const result3 = await db.query('DELETE FROM comissoes_vendedores');
        const result4 = await db.query('DELETE FROM pagamentos_comissoes');
        
        console.log('Dados removidos:');
        console.log('- Payments:', result1.rowCount);
        console.log('- Withdrawals:', result2.rowCount);
        console.log('- Comissoes:', result3.rowCount);
        console.log('- Pagamentos comissoes:', result4.rowCount);
        
        res.json({ 
            success: true, 
            message: 'Dados limpos com sucesso!',
            removidos: {
                payments: result1.rowCount,
                withdrawals: result2.rowCount,
                comissoes: result3.rowCount,
                pagamentos_comissoes: result4.rowCount
            }
        });
    } catch (err) {
        console.error('Erro ao limpar dados:', err.message);
        res.status(500).json({ error: 'Erro ao limpar dados: ' + err.message });
    }
};

// Endpoint de teste para verificar estrutura
exports.testeEstrutura = async (req, res) => {
    try {
        // Verificar tabela vendedores
        const vendedores = await db.query('SELECT COUNT(*) as count FROM vendedores');
        
        // Verificar tabela pagamentos_comissoes
        let pagamentos = { count: 0 };
        try {
            const pagamentosResult = await db.query('SELECT COUNT(*) as count FROM pagamentos_comissoes');
            pagamentos = pagamentosResult.rows[0];
        } catch (e) {
            // Tabela não existe, será criada
        }
        
        // Verificar tabela comissoes_vendedores
        let comissoes = { count: 0 };
        try {
            const comissoesResult = await db.query('SELECT COUNT(*) as count FROM comissoes_vendedores');
            comissoes = comissoesResult.rows[0];
        } catch (e) {
            // Tabela não existe, será criada
        }
        
        res.json({
            status: 'OK',
            tabelas: {
                vendedores: vendedores.rows[0].count,
                pagamentos_comissoes: pagamentos.count,
                comissoes_vendedores: comissoes.count
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Erro no teste:', err.message);
        res.status(500).json({ error: 'Erro no teste: ' + err.message });
    }
};

// Busca vendedores de um pagamento específico
exports.getPaymentVendors = async (req, res) => {
    const { paymentId } = req.params;
    try {
        // Criar tabela se não existir
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_vendors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL,
                vendedor_id TEXT NOT NULL,
                porcentagem DECIMAL(5,2) NOT NULL,
                valor_comissao DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const result = await db.query(`
            SELECT vendedor_id, porcentagem
            FROM payment_vendors
            WHERE payment_id = $1
        `, [paymentId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.json([]);
    }
};

// Busca todas as retiradas
exports.getWithdrawals = async (req, res) => {
    try {
        const withdrawals = await db.query(`
            SELECT w.*, v.name as partner_name
            FROM withdrawals w
            JOIN vendedores v ON w.partner_id = v.id
            ORDER BY w.withdrawal_date DESC
        `);
        res.json(withdrawals.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao buscar retiradas.' });
    }
};

// Adiciona uma nova retirada de sócio
exports.addWithdrawal = async (req, res) => {
    const { partnerId, amount, withdrawalDate } = req.body;
    if (!partnerId || !amount || !withdrawalDate) {
        return res.status(400).json({ error: 'Sócio, valor e data são obrigatórios.' });
    }
    try {
        const newWithdrawal = await db.query(
            'INSERT INTO withdrawals (partner_id, amount, withdrawal_date) VALUES ($1, $2, $3) RETURNING *',
            [partnerId, amount, withdrawalDate]
        );
        res.status(201).json(newWithdrawal.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao adicionar retirada.' });
    }
};

// --- NOVA FUNÇÃO para editar uma retirada ---
exports.updateWithdrawal = async (req, res) => {
    const { id } = req.params;
    const { amount, withdrawalDate } = req.body;
    try {
        const result = await db.query(
            'UPDATE withdrawals SET amount = $1, withdrawal_date = $2 WHERE id = $3 RETURNING *',
            [amount, withdrawalDate, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Retirada não encontrada.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao atualizar a retirada.' });
    }
};

// --- NOVA FUNÇÃO para excluir uma retirada ---
exports.deleteWithdrawal = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM withdrawals WHERE id = $1', [id]);
        res.json({ msg: 'Retirada excluída com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao excluir a retirada.' });
    }
};