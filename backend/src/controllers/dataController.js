const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const AWS = require('aws-sdk');

// --- CONFIGURAÇÃO DA AWS S3 ---
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'logo' || file.fieldname === 'assinatura') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Apenas imagens são permitidas'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

const uploadToS3 = (file, clientId, folder) => {
    const key = `${folder}/${clientId}/${Date.now()}-${file.originalname}`;
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };
    return s3.upload(params).promise();
};

const deleteFromS3 = (key) => {
    if (!key) return Promise.resolve();
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
    };
    return s3.deleteObject(params).promise();
};

exports.getEmployees = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees WHERE client_id = $1 ORDER BY name', [req.user.clientId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor' });
    }
};

exports.addEmployee = async (req, res) => {
    const { name } = req.body;
    if (!name) { return res.status(400).json({ error: 'O nome do funcionário é obrigatório.' }); }
    try {
        const result = await db.query( 'INSERT INTO employees (client_id, name) VALUES ($1, $2) RETURNING *', [req.user.clientId, name] );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') { return res.status(400).json({ error: 'Já existe um funcionário com este nome.' }); }
        res.status(500).json({ error: 'Erro no servidor' });
    }
};

exports.updateEmployee = async (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE employees SET name = $1 WHERE id = $2 AND client_id = $3 RETURNING *', [name, id, req.user.clientId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Funcionário não encontrado.' }); }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao atualizar funcionário.' });
    }
};

exports.deleteEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM employees WHERE id = $1 AND client_id = $2', [id, req.user.clientId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Funcionário não encontrado.' }); }
        res.json({ msg: 'Funcionário excluído com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao excluir funcionário.' });
    }
};

exports.getAllItems = async (req, res) => {
    try {
        const result = await db.query('SELECT id, type, name FROM items WHERE client_id = $1 ORDER BY name', [req.user.clientId]);
        const items = { produto: [], comprador: [], compra: [], fornecedor: [] };
        result.rows.forEach(item => { if (items[item.type]) { items[item.type].push({ id: item.id, name: item.name }); } });
        res.json(items);
    } catch (err) {  console.error(err.message); res.status(500).json({ error: 'Erro no servidor ao buscar itens.' });  }
};

exports.addItem = async (req, res) => {
    const { type, name } = req.body;
    if (!type || !name) { return res.status(400).json({ error: 'Tipo e nome são obrigatórios.' }); }
    try {
        const result = await db.query('INSERT INTO items (client_id, type, name) VALUES ($1, $2, $3) RETURNING id, name, type', [req.user.clientId, type, name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') { return res.status(400).json({ error: 'Este item já existe.' }); }
        res.status(500).json({ error: 'Erro no servidor ao adicionar item.' });
    }
};

exports.updateItem = async (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE items SET name = $1 WHERE id = $2 AND client_id = $3 RETURNING id, name, type', [name, id, req.user.clientId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Item não encontrado.' }); }
        res.json(result.rows[0]);
    } catch (err) {  console.error(err.message); res.status(500).json({ error: 'Erro no servidor ao atualizar item.' });  }
};

exports.deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM items WHERE id = $1 AND client_id = $2', [id, req.user.clientId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Item não encontrado.' }); }
        res.json({ msg: 'Item deletado com sucesso.' });
    } catch (err) {  console.error(err.message); res.status(500).json({ error: 'Erro no servidor ao deletar item.' });  }
};

// NOVOS ENDPOINTS PARA PRODUTOS UNIFICADOS
exports.getProdutos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, codigo, unidade, categoria, preco_venda, preco_custo, 
                   estoque_atual, estoque_minimo, observacoes, type
            FROM items 
            WHERE client_id = $1 AND type IN ('produto', 'compra') AND (ativo = true OR ativo IS NULL) 
            ORDER BY name
        `, [req.user.clientId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar produtos.' });
    }
};

exports.addProduto = async (req, res) => {
    const { name, codigo, unidade, categoria, preco_venda, preco_custo, estoque_atual, estoque_minimo, observacoes } = req.body;
    if (!name) { return res.status(400).json({ error: 'Nome é obrigatório.' }); }
    
    try {
        const result = await db.query(`
            INSERT INTO items (client_id, type, name, codigo, unidade, categoria, preco_venda, preco_custo, estoque_atual, estoque_minimo, observacoes, ativo)
            VALUES ($1, 'produto', $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
            RETURNING *
        `, [req.user.clientId, name, codigo || null, unidade || 'UN', categoria || null, 
            preco_venda || null, preco_custo || null, estoque_atual || 0, estoque_minimo || 0, observacoes || null]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') { return res.status(400).json({ error: 'Já existe um produto com este nome.' }); }
        res.status(500).json({ error: 'Erro no servidor ao adicionar produto.' });
    }
};

exports.updateProduto = async (req, res) => {
    const { id } = req.params;
    const { name, codigo, unidade, categoria, preco_venda, preco_custo, estoque_atual, estoque_minimo, observacoes } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE items SET 
                name = $1, codigo = $2, unidade = $3, categoria = $4, 
                preco_venda = $5, preco_custo = $6, estoque_atual = $7, 
                estoque_minimo = $8, observacoes = $9
            WHERE id = $10 AND client_id = $11 
            RETURNING *
        `, [name, codigo || null, unidade || 'UN', categoria || null, 
            preco_venda || null, preco_custo || null, estoque_atual || 0, 
            estoque_minimo || 0, observacoes || null, id, req.user.clientId]);
        
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Produto não encontrado.' }); }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao atualizar produto.' });
    }
};

exports.deleteProduto = async (req, res) => {
    const { id } = req.params;
    try {
        // Soft delete para manter integridade
        const result = await db.query('UPDATE items SET ativo = false WHERE id = $1 AND client_id = $2', [id, req.user.clientId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Produto não encontrado.' }); }
        res.json({ msg: 'Produto excluído com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao excluir produto.' });
    }
};

// ENDPOINTS PARA PEDIDOS
exports.createPedido = async (req, res) => {
    const { employee_id, tipo, cliente_fornecedor, data_pedido, data_entrega, observacoes, itens } = req.body;
    
    if (!employee_id || !tipo || !cliente_fornecedor || !itens || itens.length === 0) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Gerar número do pedido
        const numeroResult = await client.query('SELECT gerar_numero_pedido($1, $2) as numero', [req.user.clientId, tipo]);
        const numero_pedido = numeroResult.rows[0].numero;
        
        // Calcular total
        const total = itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
        
        // Criar pedido
        const pedidoResult = await client.query(`
            INSERT INTO pedidos (client_id, employee_id, tipo, numero_pedido, cliente_fornecedor, data_pedido, data_entrega, total, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `, [req.user.clientId, employee_id, tipo, numero_pedido, cliente_fornecedor, data_pedido, data_entrega || null, total, observacoes]);
        
        const pedido = pedidoResult.rows[0];
        
        // Criar itens do pedido
        for (const item of itens) {
            const subtotal = item.quantidade * item.preco_unitario;
            await client.query(`
                INSERT INTO itens_pedido (pedido_id, produto_nome, quantidade, preco_unitario, subtotal)
                VALUES ($1, $2, $3, $4, $5)
            `, [pedido.id, item.produto_nome, item.quantidade, item.preco_unitario, subtotal]);
            
            // Criar transação individual para controle financeiro
            const tipoTransacao = tipo === 'compra' ? 'gasto' : tipo; // Converter 'compra' para 'gasto'
            
            // Tentar inserir com pedido_id, se falhar, inserir sem
            try {
                const pedidoIdString = `PED_${pedido.id}_${Date.now()}`;
                const pedidoInfo = `${tipo === 'venda' ? 'Venda' : 'Compra'} - ${cliente_fornecedor} - ${itens.length} itens`;
                
                await client.query(`
                    INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status, pedido_id, pedido_info)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'A Pagar', $10, $11)
                `, [req.user.clientId, employee_id, tipoTransacao, data_pedido, item.produto_nome, cliente_fornecedor, item.quantidade, item.preco_unitario, subtotal, pedidoIdString, pedidoInfo]);
            } catch (pedidoErr) {
                // Se falhar, inserir sem pedido_id
                await client.query(`
                    INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'A Pagar')
                `, [req.user.clientId, employee_id, tipoTransacao, data_pedido, item.produto_nome, cliente_fornecedor, item.quantidade, item.preco_unitario, subtotal]);
            }
        }
        
        await client.query('COMMIT');
        res.status(201).json(pedido);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao criar pedido.' });
    } finally {
        client.release();
    }
};

exports.getPedidos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, e.name as employee_name,
                   COUNT(ip.id) as total_itens
            FROM pedidos p
            JOIN employees e ON p.employee_id = e.id
            LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
            WHERE p.client_id = $1
            GROUP BY p.id, e.name
            ORDER BY p.created_at DESC
        `, [req.user.clientId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar pedidos.' });
    }
};

exports.getPedidoDetalhes = async (req, res) => {
    const { id } = req.params;
    try {
        const pedidoResult = await db.query(`
            SELECT p.*, e.name as employee_name
            FROM pedidos p
            JOIN employees e ON p.employee_id = e.id
            WHERE p.id = $1 AND p.client_id = $2
        `, [id, req.user.clientId]);
        
        if (pedidoResult.rowCount === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        }
        
        const itensResult = await db.query(`
            SELECT * FROM itens_pedido WHERE pedido_id = $1 ORDER BY id
        `, [id]);
        
        const pedido = pedidoResult.rows[0];
        pedido.itens = itensResult.rows;
        
        res.json(pedido);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar detalhes do pedido.' });
    }
};

// Função para buscar detalhes da nota fiscal com itens
exports.getNotaFiscalDetalhes = async (req, res) => {
    const { id } = req.params;
    try {
        const nfResult = await db.query(`
            SELECT nf.*, e.name as employee_name
            FROM notas_fiscais nf
            JOIN employees e ON nf.employee_id = e.id
            WHERE nf.id = $1 AND nf.client_id = $2
        `, [id, req.user.clientId]);
        
        if (nfResult.rowCount === 0) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
        }
        
        const itensResult = await db.query(`
            SELECT * FROM itens_nota_fiscal WHERE nota_fiscal_id = $1 ORDER BY id
        `, [id]);
        
        const notaFiscal = nfResult.rows[0];
        notaFiscal.itens = itensResult.rows;
        
        res.json(notaFiscal);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar detalhes da nota fiscal.' });
    }
};

const validateTransactionItems = async (clientId, type, description, category) => {
    const categoryType = type === 'venda' ? 'comprador' : 'fornecedor';
    const descResult = await db.query('SELECT 1 FROM items WHERE client_id = $1 AND type IN ($2, $3) AND name = $4', [clientId, 'produto', 'compra', description]);
    if (descResult.rowCount === 0) { throw new Error(`O item '${description}' não está cadastrado como produto.`); }
    if (category && category.trim() !== '') {
        const catResult = await db.query('SELECT 1 FROM items WHERE client_id = $1 AND type = $2 AND name = $3', [clientId, categoryType, category]);
        if (catResult.rowCount === 0) { throw new Error(`O item '${category}' não está cadastrado como um(a) ${categoryType}.`); }
    }
    return true;
};

exports.getTransactions = async (req, res) => {
    const clientId = req.user.clientId;
    const { employeeId, startDate, endDate, status, product, buyer, purchase, supplier } = req.query;
    let queryText = ` SELECT t.*, e.name as employee_name, a.id as attachment_id, a.file_path, a.file_name FROM transactions t JOIN employees e ON t.employee_id = e.id LEFT JOIN attachments a ON t.id = a.transaction_id WHERE t.client_id = $1 `;
    let queryParams = [clientId];
    let paramIndex = 2;
    if (employeeId && employeeId !== 'todos') { queryText += ` AND t.employee_id = $${paramIndex++}`; queryParams.push(employeeId); }
    if (startDate) { queryText += ` AND t.transaction_date >= $${paramIndex++}`; queryParams.push(startDate); }
    if (endDate) { queryText += ` AND t.transaction_date <= $${paramIndex++}`; queryParams.push(endDate); }
    if (status && status !== 'todos') { queryText += ` AND t.status = $${paramIndex++}`; queryParams.push(status); }
    if (product && product !== 'todos') { queryText += ` AND t.type = 'venda' AND t.description = $${paramIndex++}`; queryParams.push(product); }
    if (buyer && buyer !== 'todos') { queryText += ` AND t.type = 'venda' AND t.category = $${paramIndex++}`; queryParams.push(buyer); }
    if (purchase && purchase !== 'todos') { queryText += ` AND t.type = 'gasto' AND t.description = $${paramIndex++}`; queryParams.push(purchase); }
    if (supplier && supplier !== 'todos') { queryText += ` AND t.type = 'gasto' AND t.category = $${paramIndex++}`; queryParams.push(supplier); }
    queryText += ' ORDER BY t.transaction_date DESC';
    try {
        const transactionsResult = await db.query(queryText, queryParams);
        res.json(transactionsResult.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor ao buscar transações.');
    }
};

exports.addTransaction = async (req, res) => {
    const { employee_id, type, transaction_date, description, category, quantity, unit_price, status, pedido_id, pedido_info } = req.body;
    if (!employee_id || !type || !transaction_date || !description || !quantity || !unit_price || !status) { return res.status(400).json({ error: "Todos os campos são obrigatórios." }); }
    const total_price = parseFloat(quantity) * parseFloat(unit_price);
    try {
        await validateTransactionItems(req.user.clientId, type, description, category);
        
        // Tentar inserir com pedido_id, se falhar, inserir sem
        let result;
        try {
            result = await db.query( 'INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status, pedido_id, pedido_info) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *', [req.user.clientId, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status, pedido_id || null, pedido_info || null] );
        } catch (pedidoErr) {
            // Se falhar (coluna não existe ou tipo errado), inserir sem pedido_id
            result = await db.query( 'INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [req.user.clientId, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status] );
        }
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ error: err.message });
    }
};

exports.updateTransaction = async (req, res) => {
    const { id } = req.params;
    const { employee_id, type, transaction_date, description, category, quantity, unit_price, status, pedido_id, pedido_info } = req.body;
    const total_price = parseFloat(quantity) * parseFloat(unit_price);
    try {
        await validateTransactionItems(req.user.clientId, type, description, category);
        
        // Tentar atualizar com pedido_id, se falhar, atualizar sem
        let result;
        try {
            result = await db.query( 'UPDATE transactions SET employee_id = $1, transaction_date = $2, description = $3, category = $4, quantity = $5, unit_price = $6, total_price = $7, status = $8, type = $9, pedido_id = $10, pedido_info = $11 WHERE id = $12 AND client_id = $13 RETURNING *', [employee_id, transaction_date, description, category, quantity, unit_price, total_price, status, type, pedido_id || null, pedido_info || null, id, req.user.clientId] );
        } catch (pedidoErr) {
            // Se falhar, atualizar sem pedido_id
            result = await db.query( 'UPDATE transactions SET employee_id = $1, transaction_date = $2, description = $3, category = $4, quantity = $5, unit_price = $6, total_price = $7, status = $8, type = $9 WHERE id = $10 AND client_id = $11 RETURNING *', [employee_id, transaction_date, description, category, quantity, unit_price, total_price, status, type, id, req.user.clientId] );
        }
        
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Transação não encontrada.' }); }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ error: err.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM transactions WHERE id = $1 AND client_id = $2', [id, req.user.clientId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Transação não encontrada ou não pertence a este cliente.' }); }
        res.json({ msg: 'Transação deletada com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao deletar transação.' });
    }
};

exports.batchDeleteTransactions = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) { return res.status(400).json({ error: 'Uma lista de IDs é necessária.' }); }
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query( 'DELETE FROM transactions WHERE id = ANY($1) AND client_id = $2', [ids, req.user.clientId] );
        await client.query('COMMIT');
        res.json({ msg: 'Lançamentos selecionados foram deletados com sucesso.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao deletar lançamentos.' });
    } finally {
        client.release();
    }
};

exports.generateReport = async (req, res) => {
    const clientId = req.user.clientId;
    const { filteredData, summary, filters, viewType, employeeName } = req.body;
    
    try {
        const clientInfo = await db.query(`SELECT company_name, cnpj_cpf, contact_phone, email, pix, full_address, website, 
                                                   inscricao_estadual, inscricao_municipal, logo_path, cor_tema,
                                                   cep, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf 
                                            FROM clients WHERE id = $1`, [clientId]);
        const profile = clientInfo.rows[0] || {};
        
        const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
        const formatQuantity = (value) => new Intl.NumberFormat('pt-BR').format(value || 0);
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return new Date(date.getTime() + (date.getTimezoneOffset() * 60000)).toLocaleDateString('pt-BR');
        };

        filteredData.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        let title = "Relatório de Fechamento";
        let subtitle = "";
        const isCompradorEspecifico = viewType === 'vendas' && filters.buyer !== 'todos';
        const isFornecedorEspecifico = viewType === 'gastos' && filters.supplier !== 'todos';
        const isFuncionarioEspecifico = filters.employeeId !== 'todos';

        if (isCompradorEspecifico) {
            title = "Relatório de Fechamento - Venda";
            subtitle = `<h2 style="font-size: 1.5em; margin: 10px 0;">Comprador: ${filters.buyer.toUpperCase()}</h2>`;
        } else if (isFornecedorEspecifico) {
            title = "Relatório de Fechamento - Compra";
            subtitle = `<h2 style="font-size: 1.5em; margin: 10px 0;">Fornecedor: ${filters.supplier.toUpperCase()}</h2>`;
        } else if (isFuncionarioEspecifico) {
            subtitle = `<h2 style="font-size: 1.5em; margin: 10px 0;">Funcionário: ${employeeName.toUpperCase()}</h2>`;
            if (viewType === 'vendas') title = "Relatório de Fechamento - Venda";
            else if (viewType === 'gastos') title = "Relatório de Fechamento - Compra";
        } else {
            title = "Relatório de Fechamento - Geral";
        }

        let finalTableHeaders = [];
        let tableRows = '';

        if (isCompradorEspecifico || isFornecedorEspecifico) {
            finalTableHeaders = ['Data', 'Quantidade', viewType === 'vendas' ? 'Produto' : 'Compra', 'Valor Unitário', 'Valor Total', 'Status'];
            tableRows = filteredData.map(item => `
                <tr>
                    <td>${formatDate(item.transaction_date)}</td>
                    <td>${formatQuantity(item.quantity)}</td>
                    <td>${item.description || ''}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td style="color:${item.type === 'venda' ? 'green' : 'red'};">${formatCurrency(item.total_price)}</td>
                    <td>${item.status || ''}</td>
                </tr>
            `).join('');
        } else {
            finalTableHeaders = ['Data', 'Funcionário', 'Quantidade', 'Produto/Compra', 'Valor Unitário', 'Valor Total', 'Comprador/Forn.', 'Status'];
            if (isFuncionarioEspecifico) {
                finalTableHeaders = finalTableHeaders.filter(h => h !== 'Funcionário');
            }
            tableRows = filteredData.map(item => `
                <tr>
                    <td>${formatDate(item.transaction_date)}</td>
                    ${!isFuncionarioEspecifico ? `<td>${item.employee_name || ''}</td>` : ''}
                    <td>${formatQuantity(item.quantity)}</td>
                    <td>${item.description || ''}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td style="color:${item.type === 'venda' ? 'green' : 'red'};">${formatCurrency(item.total_price)}</td>
                    <td>${item.category || ''}</td>
                    <td>${item.status || ''}</td>
                </tr>
            `).join('');
        }
        
        const logoUrl = profile.logo_path ? `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${profile.logo_path}` : '';

        const corTema = profile.cor_tema || '#2c5aa0';
        
        // Gerar QR Code
        const QRCode = require('qrcode');
        let qrCodeDataUrl = '';
        if (profile.pix || profile.email || profile.contact_phone) {
            try {
                const qrData = profile.pix || profile.email || profile.contact_phone;
                qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 80, margin: 1 });
            } catch (qrErr) {
                console.log('Erro ao gerar QR Code:', qrErr);
            }
        }
        
        // Usar endereço completo gerado automaticamente
        const enderecoCompleto = profile.full_address;

        const currentDate = new Date().toLocaleDateString('pt-BR');
        const reportNumber = `REL-${Date.now().toString().slice(-6)}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #333; }
                    .document { max-width: 800px; margin: 0 auto; background: white; }
                    .header { border-bottom: 3px solid ${corTema}; padding-bottom: 20px; margin-bottom: 30px; }
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 24px; font-weight: bold; color: ${corTema}; margin: 0; }
                    .company-details { margin: 5px 0; color: #666; }
                    .logo { max-width: 120px; max-height: 80px; }
                    .report-info { text-align: right; }
                    .report-title { font-size: 20px; font-weight: bold; color: ${corTema}; margin: 0; }
                    .report-number { color: #666; margin: 5px 0; }
                    .client-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .client-info h3 { margin: 0 0 10px 0; color: ${corTema}; }
                    .period-info { background: #e3f2fd; padding: 10px 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background: ${corTema}; color: white; padding: 12px 8px; text-align: left; font-weight: bold; }
                    td { padding: 10px 8px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f8f9fa; }
                    .amount { text-align: right; font-weight: bold; }
                    .amount.positive { color: #28a745; }
                    .amount.negative { color: #dc3545; }
                    .summary { background: #f8f9fa; border: 2px solid ${corTema}; border-radius: 5px; padding: 20px; margin: 30px 0; }
                    .summary h3 { color: ${corTema}; margin: 0 0 15px 0; text-align: center; }
                    .summary-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; }
                    .summary-total { border-top: 2px solid ${corTema}; padding-top: 10px; margin-top: 15px; font-size: 18px; font-weight: bold; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
                    .no-print { margin: 20px 0; text-align: center; }
                    .print-btn { background: ${corTema}; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="document">

                    <div class="header">
                        <div class="header-top">
                            <div class="company-info">
                                <h1 class="company-name">${profile.company_name || req.user.companyName || 'Empresa'}</h1>
                                ${profile.cnpj_cpf ? `<div class="company-details">CNPJ/CPF: ${profile.cnpj_cpf}</div>` : ''}
                                ${enderecoCompleto ? `<div class="company-details">${enderecoCompleto}</div>` : ''}
                                ${profile.contact_phone ? `<div class="company-details">Tel: ${profile.contact_phone}</div>` : ''}
                                ${profile.email ? `<div class="company-details">Email: ${profile.email}</div>` : ''}
                                ${profile.pix ? `<div class="company-details">PIX: ${profile.pix}</div>` : ''}
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                                ${profile.logo_path ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
                                ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" style="width: 60px; height: 60px;">` : ''}
                            </div>
                        </div>
                        <div class="report-info">
                            <div class="report-title">${title}</div>
                            <div class="report-number">Nº ${reportNumber}</div>
                            <div class="report-number">Emitido em: ${currentDate}</div>
                        </div>
                    </div>

                    ${subtitle ? `<div class="client-info"><h3>${viewType === 'vendas' ? 'Cliente' : 'Fornecedor'}</h3>${subtitle.replace(/<[^>]*>/g, '')}</div>` : ''}
                    
                    <div class="period-info">
                        <strong>Período de Referência:</strong> ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}
                    </div>

                    <div class="no-print">
                        <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
                    </div>

                    <table>
                        <thead>
                            <tr>${finalTableHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>

                    <div class="summary">
                        <h3>Resumo Financeiro</h3>
                        <div class="summary-row">
                            <span>Total de Vendas:</span>
                            <span class="amount positive">${formatCurrency(summary.ganhos)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Total de Compras:</span>
                            <span class="amount negative">${formatCurrency(summary.gastos)}</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span>Saldo Líquido:</span>
                            <span class="amount ${summary.saldo >= 0 ? 'positive' : 'negative'}">${formatCurrency(summary.saldo)}</span>
                        </div>
                    </div>

                    ${profile.pix || profile.email || profile.website ? `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <h4 style="color: #2c5aa0; margin: 0 0 10px 0;">Informações de Contato</h4>
                        ${profile.pix ? `<p style="margin: 5px 0;"><strong>PIX:</strong> ${profile.pix}</p>` : ''}
                        ${profile.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${profile.email}</p>` : ''}
                        ${profile.website ? `<p style="margin: 5px 0;"><strong>Site:</strong> ${profile.website}</p>` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="footer">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div>
                                <p style="margin: 0; font-size: 12px;">Documento gerado automaticamente pelo sistema</p>
                                <p style="margin: 0; font-size: 12px;">Data de emissão: ${currentDate}</p>

                            </div>
                            ${qrCodeDataUrl ? `<div style="text-align: right;"><img src="${qrCodeDataUrl}" alt="QR Code" style="width: 80px; height: 80px;"></div>` : ''}
                        </div>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                        <p style="margin: 0; font-size: 11px; text-align: center;">Este relatório contém informações confidenciais e destina-se exclusivamente ao uso do destinatário.</p>
                        ${profile.inscricao_estadual || profile.inscricao_municipal ? `
                        <p style="margin: 5px 0 0 0; font-size: 10px; text-align: center; color: #666;">
                            ${profile.inscricao_estadual ? `IE: ${profile.inscricao_estadual}` : ''}
                            ${profile.inscricao_estadual && profile.inscricao_municipal ? ' | ' : ''}
                            ${profile.inscricao_municipal ? `IM: ${profile.inscricao_municipal}` : ''}
                        </p>
                        ` : ''}
                    </div>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("<h1>Erro interno ao gerar o relatório.</h1>");
    }
};

exports.addAttachment = async (req, res) => {
    upload.single('attachment')(req, res, async function (err) {
        if (err) { return res.status(500).json({ error: "Erro no upload do anexo." }); }
        if (!req.file) { return res.status(400).json({ error: "Nenhum ficheiro enviado." }); }

        const { transactionId } = req.params;
        const { originalname, mimetype } = req.file;

        try {
            const trxResult = await db.query('SELECT id FROM transactions WHERE id = $1 AND client_id = $2', [transactionId, req.user.clientId]);
            if (trxResult.rowCount === 0) {
                return res.status(403).json({ error: "Acesso negado a esta transação." });
            }

            const oldAttachment = await db.query('SELECT file_path FROM attachments WHERE transaction_id = $1', [transactionId]);
            if (oldAttachment.rows[0] && oldAttachment.rows[0].file_path) {
                await deleteFromS3(oldAttachment.rows[0].file_path);
                await db.query('DELETE FROM attachments WHERE transaction_id = $1', [transactionId]);
            }

            const s3Response = await uploadToS3(req.file, req.user.clientId, 'attachments');
            
            await db.query( 'INSERT INTO attachments (client_id, transaction_id, file_name, file_path, file_type) VALUES ($1, $2, $3, $4, $5) RETURNING id', [req.user.clientId, transactionId, originalname, s3Response.Key, mimetype] );
            res.status(201).json({ msg: 'Anexo adicionado com sucesso!' });
        } catch (dbErr) {
            console.error("Erro ao salvar anexo:", dbErr);
            res.status(500).json({ error: 'Erro ao guardar a referência do anexo.' });
        }
    });
};

exports.deleteAttachment = async (req, res) => {
    const { attachmentId } = req.params;
    const clientId = req.user.clientId;
    try {
        const attachResult = await db.query( 'SELECT file_path FROM attachments WHERE id = $1 AND client_id = $2', [attachmentId, clientId] );
        if (attachResult.rowCount === 0) { return res.status(404).json({ error: "Anexo não encontrado ou não pertence a este cliente." }); }
        const { file_path } = attachResult.rows[0];
        
        await deleteFromS3(file_path);
        await db.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

        res.json({ msg: 'Anexo excluído com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao excluir o anexo.' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT company_name, cnpj_cpf, contact_phone, email, pix, full_address, website, 
                    inscricao_estadual, inscricao_municipal, logo_path, cor_tema,
                    cep, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf 
             FROM clients WHERE id = $1`,
            [req.user.clientId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Perfil do cliente não encontrado.' });
        }
        
        const profile = result.rows[0];
        
        // Converter null para string vazia
        Object.keys(profile).forEach(key => {
            if (profile[key] === null) {
                profile[key] = '';
            }
        });
        
        if (profile.logo_path) {
            profile.logo_url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${profile.logo_path}`;
        }
        


        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar perfil.' });
    }
};

// ENDPOINTS PARA NOTAS FISCAIS
exports.getNotasFiscais = async (req, res) => {
    try {
        const { tipo, status, dataInicio, dataFim } = req.query;
        let queryText = `
            SELECT nf.*, e.name as employee_name,
                   COUNT(inf.id) as total_itens
            FROM notas_fiscais nf
            JOIN employees e ON nf.employee_id = e.id
            LEFT JOIN itens_nota_fiscal inf ON nf.id = inf.nota_fiscal_id
            WHERE nf.client_id = $1
        `;
        let queryParams = [req.user.clientId];
        let paramIndex = 2;
        
        if (tipo && tipo !== 'todos') {
            queryText += ` AND nf.tipo = $${paramIndex++}`;
            queryParams.push(tipo);
        }
        if (status && status !== 'todos') {
            queryText += ` AND nf.status = $${paramIndex++}`;
            queryParams.push(status);
        }
        if (dataInicio) {
            queryText += ` AND nf.data_emissao >= $${paramIndex++}`;
            queryParams.push(dataInicio);
        }
        if (dataFim) {
            queryText += ` AND nf.data_emissao <= $${paramIndex++}`;
            queryParams.push(dataFim);
        }
        
        queryText += ' GROUP BY nf.id, e.name ORDER BY nf.created_at DESC';
        
        const result = await db.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar notas fiscais.' });
    }
};

exports.createNotaFiscal = async (req, res) => {
    const { tipo, cliente_fornecedor_nome, data_emissao, data_vencimento, observacoes, itens, valor_total } = req.body;
    
    if (!tipo || !cliente_fornecedor_nome || !data_emissao || !itens || itens.length === 0) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Gerar número da NF
        const numeroResult = await client.query('SELECT gerar_numero_nf($1) as numero', [req.user.clientId]);
        const numero_nf = numeroResult.rows[0].numero;
        
        // Criar nota fiscal
        const nfResult = await client.query(`
            INSERT INTO notas_fiscais (client_id, employee_id, numero_nf, tipo, cliente_fornecedor_nome, 
                                       data_emissao, data_vencimento, valor_total, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `, [req.user.clientId, req.user.employeeId || req.user.clientId, numero_nf, tipo, cliente_fornecedor_nome, 
            data_emissao, data_vencimento || null, valor_total, observacoes]);
        
        const notaFiscal = nfResult.rows[0];
        
        // Criar itens da nota fiscal
        for (const item of itens) {
            await client.query(`
                INSERT INTO itens_nota_fiscal (nota_fiscal_id, produto_nome, produto_codigo, quantidade, 
                                               valor_unitario, valor_total, cfop, cst)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [notaFiscal.id, item.produto_nome, item.produto_codigo || null, item.quantidade, 
                item.valor_unitario, item.valor_total, item.cfop || '5102', item.cst || '000']);
        }
        
        await client.query('COMMIT');
        res.status(201).json(notaFiscal);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao criar nota fiscal.' });
    } finally {
        client.release();
    }
};

exports.updateNotaFiscal = async (req, res) => {
    const { id } = req.params;
    const { tipo, cliente_fornecedor_nome, data_emissao, data_vencimento, observacoes, itens, valor_total } = req.body;
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Atualizar nota fiscal
        const result = await client.query(`
            UPDATE notas_fiscais SET 
                tipo = $1, cliente_fornecedor_nome = $2, data_emissao = $3, 
                data_vencimento = $4, valor_total = $5, observacoes = $6, updated_at = NOW()
            WHERE id = $7 AND client_id = $8 
            RETURNING *
        `, [tipo, cliente_fornecedor_nome, data_emissao, data_vencimento || null, 
            valor_total, observacoes, id, req.user.clientId]);
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
        }
        
        // Remover itens antigos
        await client.query('DELETE FROM itens_nota_fiscal WHERE nota_fiscal_id = $1', [id]);
        
        // Criar novos itens
        for (const item of itens) {
            await client.query(`
                INSERT INTO itens_nota_fiscal (nota_fiscal_id, produto_nome, produto_codigo, quantidade, 
                                               valor_unitario, valor_total, cfop, cst)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [id, item.produto_nome, item.produto_codigo || null, item.quantidade, 
                item.valor_unitario, item.valor_total, item.cfop || '5102', item.cst || '000']);
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao atualizar nota fiscal.' });
    } finally {
        client.release();
    }
};

exports.deleteNotaFiscal = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM notas_fiscais WHERE id = $1 AND client_id = $2', [id, req.user.clientId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
        }
        res.json({ msg: 'Nota fiscal excluída com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao excluir nota fiscal.' });
    }
};

// GERAR PDF DA NOTA FISCAL
exports.gerarPdfNotaFiscal = async (req, res) => {
    const { id } = req.params;
    try {
        // Buscar dados da nota fiscal
        const nfResult = await db.query(`
            SELECT nf.*, e.name as employee_name
            FROM notas_fiscais nf
            JOIN employees e ON nf.employee_id = e.id
            WHERE nf.id = $1 AND nf.client_id = $2
        `, [id, req.user.clientId]);
        
        if (nfResult.rowCount === 0) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
        }
        
        const notaFiscal = nfResult.rows[0];
        
        // Buscar itens
        const itensResult = await db.query(`
            SELECT * FROM itens_nota_fiscal WHERE nota_fiscal_id = $1 ORDER BY id
        `, [id]);
        
        // Buscar dados da empresa
        const clientInfo = await db.query(`
            SELECT company_name, cnpj_cpf, contact_phone, email, full_address, 
                   inscricao_estadual, inscricao_municipal, logo_path, cor_tema
            FROM clients WHERE id = $1
        `, [req.user.clientId]);
        
        const profile = clientInfo.rows[0] || {};
        const corTema = profile.cor_tema || '#2c5aa0';
        const logoUrl = profile.logo_path ? `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${profile.logo_path}` : '';
        
        const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return new Date(date.getTime() + (date.getTimezoneOffset() * 60000)).toLocaleDateString('pt-BR');
        };
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Nota Fiscal ${notaFiscal.numero_nf}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 15px; font-size: 12px; }
                    .nf-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; }
                    .nf-header { border-bottom: 2px solid #000; padding: 10px; display: flex; justify-content: space-between; }
                    .nf-title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; }
                    .nf-section { border-bottom: 1px solid #000; padding: 8px; }
                    .nf-row { display: flex; }
                    .nf-col { flex: 1; padding: 5px; border-right: 1px solid #000; }
                    .nf-col:last-child { border-right: none; }
                    .nf-label { font-weight: bold; font-size: 10px; }
                    .nf-value { margin-top: 2px; }
                    .nf-table { width: 100%; border-collapse: collapse; }
                    .nf-table th, .nf-table td { border: 1px solid #000; padding: 5px; text-align: left; font-size: 10px; }
                    .nf-table th { background-color: #f0f0f0; font-weight: bold; }
                    .nf-total { background-color: #f9f9f9; font-weight: bold; }
                    .no-print { margin: 20px 0; text-align: center; }
                    .print-btn { background: ${corTema}; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 0 5px; }
                    @media print { .no-print { display: none; } body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                    <button class="print-btn" onclick="window.print()">📄 Salvar PDF</button>
                </div>
                
                <div class="nf-container">
                    <div class="nf-header">
                        <div>
                            ${logoUrl ? `<img src="${logoUrl}" style="max-width: 80px; max-height: 60px;">` : ''}
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 14px; font-weight: bold;">${profile.company_name || 'EMPRESA'}</div>
                            <div style="font-size: 10px;">${profile.full_address || ''}</div>
                            <div style="font-size: 10px;">CNPJ: ${profile.cnpj_cpf || ''} | IE: ${profile.inscricao_estadual || 'ISENTO'}</div>
                        </div>
                        <div style="text-align: right; font-size: 10px;">
                            <div>NF-e</div>
                            <div>Nº ${notaFiscal.numero_nf}</div>
                            <div>Série ${notaFiscal.serie || '1'}</div>
                        </div>
                    </div>
                    
                    <div class="nf-title">NOTA FISCAL ELETRÔNICA</div>
                    
                    <div class="nf-section">
                        <div class="nf-row">
                            <div class="nf-col">
                                <div class="nf-label">NATUREZA DA OPERAÇÃO</div>
                                <div class="nf-value">${notaFiscal.tipo === 'saida' ? 'VENDA DE MERCADORIA' : 'COMPRA DE MERCADORIA'}</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-label">PROTOCOLO DE AUTORIZAÇÃO</div>
                                <div class="nf-value">${notaFiscal.chave_acesso || 'DOCUMENTO INTERNO'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="nf-section">
                        <div class="nf-row">
                            <div class="nf-col" style="flex: 2;">
                                <div class="nf-label">${notaFiscal.tipo === 'saida' ? 'DESTINATÁRIO' : 'REMETENTE'}</div>
                                <div class="nf-value" style="font-weight: bold;">${notaFiscal.cliente_fornecedor_nome}</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-label">DATA DE EMISSÃO</div>
                                <div class="nf-value">${formatDate(notaFiscal.data_emissao)}</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-label">DATA DE VENCIMENTO</div>
                                <div class="nf-value">${formatDate(notaFiscal.data_vencimento) || 'À VISTA'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="nf-section">
                        <div class="nf-label" style="margin-bottom: 10px;">DISCRIMINAÇÃO DOS SERVIÇOS / PRODUTOS</div>
                        <table class="nf-table">
                            <thead>
                                <tr>
                                    <th style="width: 40%;">DESCRIÇÃO</th>
                                    <th style="width: 10%;">QTDE</th>
                                    <th style="width: 10%;">UNID</th>
                                    <th style="width: 15%;">VL. UNIT</th>
                                    <th style="width: 15%;">VL. TOTAL</th>
                                    <th style="width: 10%;">CFOP</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itensResult.rows.map(item => `
                                    <tr>
                                        <td>${item.produto_nome}${item.produto_codigo ? ` (${item.produto_codigo})` : ''}</td>
                                        <td style="text-align: center;">${parseFloat(item.quantidade).toLocaleString('pt-BR', {minimumFractionDigits: 3})}</td>
                                        <td style="text-align: center;">${item.unidade || 'UN'}</td>
                                        <td style="text-align: right;">${formatCurrency(item.valor_unitario)}</td>
                                        <td style="text-align: right;">${formatCurrency(item.valor_total)}</td>
                                        <td style="text-align: center;">${item.cfop}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="nf-section">
                        <div class="nf-row">
                            <div class="nf-col">
                                <div class="nf-label">BASE DE CÁLCULO DO ICMS</div>
                                <div class="nf-value">${formatCurrency(notaFiscal.valor_total)}</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-label">VALOR DO ICMS</div>
                                <div class="nf-value">R$ 0,00</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-label">VALOR TOTAL DOS PRODUTOS</div>
                                <div class="nf-value">${formatCurrency(notaFiscal.valor_total)}</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-label">VALOR DO FRETE</div>
                                <div class="nf-value">${formatCurrency(notaFiscal.valor_frete || 0)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="nf-section nf-total">
                        <div class="nf-row">
                            <div class="nf-col" style="flex: 3;">
                                <div class="nf-label">VALOR TOTAL DA NOTA</div>
                            </div>
                            <div class="nf-col">
                                <div class="nf-value" style="font-size: 16px; font-weight: bold;">${formatCurrency(notaFiscal.valor_total)}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${notaFiscal.observacoes ? `
                    <div class="nf-section">
                        <div class="nf-label">INFORMAÇÕES COMPLEMENTARES</div>
                        <div class="nf-value">${notaFiscal.observacoes}</div>
                    </div>
                    ` : ''}
                    
                    <div class="nf-section" style="border-bottom: none; text-align: center; font-size: 10px; color: #666;">
                        <div>Documento gerado automaticamente pelo sistema em ${new Date().toLocaleString('pt-BR')}</div>
                        ${profile.contact_phone ? `<div>Contato: ${profile.contact_phone}${profile.email ? ` | ${profile.email}` : ''}</div>` : ''}
                    </div>
                </div>
            </body>
            </html>
        `;
        
        res.send(html);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("<h1>Erro interno ao gerar nota fiscal.</h1>");
    }
};

// ENDPOINT PARA BUSCA GLOBAL
exports.globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        const clientId = req.user.clientId;
        
        if (!q || q.length < 2) {
            return res.json([]);
        }
        
        const searchTerm = `%${q.toLowerCase()}%`;
        const results = [];
        
        // Buscar produtos
        const produtos = await db.query(`
            SELECT id, name, codigo, categoria, 'produto' as type
            FROM items 
            WHERE client_id = $1 AND type IN ('produto', 'compra') AND (ativo = true OR ativo IS NULL)
            AND (LOWER(name) LIKE $2 OR LOWER(codigo) LIKE $2 OR LOWER(categoria) LIKE $2)
            LIMIT 5
        `, [clientId, searchTerm]);
        
        produtos.rows.forEach(item => {
            results.push({
                type: 'produto',
                name: item.name,
                description: item.codigo ? `Código: ${item.codigo}` : item.categoria
            });
        });
        
        // Buscar clientes
        const clientes = await db.query(`
            SELECT id, name, 'cliente' as type
            FROM items 
            WHERE client_id = $1 AND type = 'comprador'
            AND LOWER(name) LIKE $2
            LIMIT 5
        `, [clientId, searchTerm]);
        
        clientes.rows.forEach(item => {
            results.push({
                type: 'cliente',
                name: item.name,
                description: 'Cliente'
            });
        });
        
        // Buscar fornecedores
        const fornecedores = await db.query(`
            SELECT id, name, 'fornecedor' as type
            FROM items 
            WHERE client_id = $1 AND type = 'fornecedor'
            AND LOWER(name) LIKE $2
            LIMIT 5
        `, [clientId, searchTerm]);
        
        fornecedores.rows.forEach(item => {
            results.push({
                type: 'fornecedor',
                name: item.name,
                description: 'Fornecedor'
            });
        });
        
        // Buscar transações recentes
        const transacoes = await db.query(`
            SELECT id, description, category, type, total_price, transaction_date
            FROM transactions 
            WHERE client_id = $1
            AND (LOWER(description) LIKE $2 OR LOWER(category) LIKE $2)
            ORDER BY transaction_date DESC
            LIMIT 3
        `, [clientId, searchTerm]);
        
        transacoes.rows.forEach(item => {
            results.push({
                type: 'transacao',
                name: item.description,
                description: `${item.type === 'venda' ? 'Venda' : 'Compra'} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_price)}`
            });
        });
        
        // Buscar notas fiscais
        const notasFiscais = await db.query(`
            SELECT id, numero_nf, cliente_fornecedor_nome, tipo, valor_total
            FROM notas_fiscais 
            WHERE client_id = $1
            AND (LOWER(cliente_fornecedor_nome) LIKE $2 OR numero_nf LIKE $2)
            ORDER BY created_at DESC
            LIMIT 3
        `, [clientId, searchTerm]);
        
        notasFiscais.rows.forEach(item => {
            results.push({
                type: 'nota_fiscal',
                name: `NF ${item.numero_nf} - ${item.cliente_fornecedor_nome}`,
                description: `${item.tipo === 'saida' ? 'Saída' : 'Entrada'} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_total)}`
            });
        });
        
        // Limitar total de resultados
        res.json(results.slice(0, 10));
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar.' });
    }
};

// ENDPOINT PARA DASHBOARD
exports.getDashboardData = async (req, res) => {
    try {
        const { periodo = '30' } = req.query;
        const clientId = req.user.clientId;
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));
        
        // Resumo financeiro
        const resumoResult = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'venda' THEN total_price ELSE 0 END), 0) as vendas_mes,
                COALESCE(SUM(CASE WHEN type = 'gasto' THEN total_price ELSE 0 END), 0) as compras_mes,
                COALESCE(SUM(CASE WHEN type = 'venda' THEN total_price ELSE -total_price END), 0) as lucro_mes
            FROM transactions 
            WHERE client_id = $1 AND transaction_date >= $2
        `, [clientId, dataInicio.toISOString().split('T')[0]]);
        
        // Contadores
        const contadoresResult = await db.query(`
            SELECT 
                (SELECT COUNT(DISTINCT category) FROM transactions WHERE client_id = $1 AND type = 'venda' AND transaction_date >= $2) as clientes_ativos,
                (SELECT COUNT(*) FROM items WHERE client_id = $1 AND type IN ('produto', 'compra') AND (ativo = true OR ativo IS NULL)) as produtos_cadastrados,
                (SELECT COUNT(*) FROM notas_fiscais WHERE client_id = $1 AND data_emissao >= $2) as notas_fiscais_mes
        `, [clientId, dataInicio.toISOString().split('T')[0]]);
        
        // Vendas diárias
        const vendasDiariasResult = await db.query(`
            SELECT 
                transaction_date::date as data,
                COALESCE(SUM(CASE WHEN type = 'venda' THEN total_price ELSE 0 END), 0) as vendas,
                COALESCE(SUM(CASE WHEN type = 'gasto' THEN total_price ELSE 0 END), 0) as compras
            FROM transactions 
            WHERE client_id = $1 AND transaction_date >= $2
            GROUP BY transaction_date::date
            ORDER BY transaction_date::date
        `, [clientId, dataInicio.toISOString().split('T')[0]]);
        
        // Produtos mais vendidos
        const produtosMaisVendidosResult = await db.query(`
            SELECT 
                description as nome,
                SUM(quantity) as quantidade,
                SUM(total_price) as total
            FROM transactions 
            WHERE client_id = $1 AND type = 'venda' AND transaction_date >= $2
            GROUP BY description
            ORDER BY SUM(total_price) DESC
            LIMIT 5
        `, [clientId, dataInicio.toISOString().split('T')[0]]);
        
        // Top clientes
        const clientesTopResult = await db.query(`
            SELECT 
                category as nome,
                SUM(total_price) as valor
            FROM transactions 
            WHERE client_id = $1 AND type = 'venda' AND transaction_date >= $2 AND category IS NOT NULL
            GROUP BY category
            ORDER BY SUM(total_price) DESC
            LIMIT 5
        `, [clientId, dataInicio.toISOString().split('T')[0]]);
        
        // Vendas por categoria (simulado)
        const vendasPorCategoriaResult = await db.query(`
            SELECT 
                COALESCE(i.categoria, 'Sem Categoria') as categoria,
                SUM(t.total_price) as valor
            FROM transactions t
            LEFT JOIN items i ON i.name = t.description AND i.client_id = t.client_id
            WHERE t.client_id = $1 AND t.type = 'venda' AND t.transaction_date >= $2
            GROUP BY i.categoria
            ORDER BY SUM(t.total_price) DESC
            LIMIT 5
        `, [clientId, dataInicio.toISOString().split('T')[0]]);
        
        // Alertas
        const alertas = [];
        
        // Verificar produtos com estoque baixo
        const estoqueBaixoResult = await db.query(`
            SELECT COUNT(*) as count FROM items 
            WHERE client_id = $1 AND type IN ('produto', 'compra') 
            AND (ativo = true OR ativo IS NULL) AND estoque_atual <= estoque_minimo AND estoque_minimo > 0
        `, [clientId]);
        
        if (estoqueBaixoResult.rows[0].count > 0) {
            alertas.push({
                tipo: 'warning',
                mensagem: `${estoqueBaixoResult.rows[0].count} produto(s) com estoque baixo`,
                acao: 'Ver Produtos'
            });
        }
        
        // Verificar vendas do dia
        const vendasHojeResult = await db.query(`
            SELECT COALESCE(SUM(total_price), 0) as vendas_hoje
            FROM transactions 
            WHERE client_id = $1 AND type = 'venda' AND transaction_date = CURRENT_DATE
        `, [clientId]);
        
        if (vendasHojeResult.rows[0].vendas_hoje > 1000) {
            alertas.push({
                tipo: 'success',
                mensagem: `Ótimo! Você já vendeu R$ ${parseFloat(vendasHojeResult.rows[0].vendas_hoje).toLocaleString('pt-BR', {minimumFractionDigits: 2})} hoje`,
                acao: null
            });
        }
        
        const dashboardData = {
            resumo: {
                ...resumoResult.rows[0],
                ...contadoresResult.rows[0]
            },
            vendas_diarias: vendasDiariasResult.rows.map(row => ({
                ...row,
                data: new Date(row.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            })),
            produtos_mais_vendidos: produtosMaisVendidosResult.rows,
            clientes_top: clientesTopResult.rows,
            vendas_por_categoria: vendasPorCategoriaResult.rows,
            alertas
        };
        
        res.json(dashboardData);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar dados do dashboard.' });
    }
};



// ENDPOINT DE TESTE PARA GERAR NOTA FISCAL DE EXEMPLO
exports.criarNotaFiscalTeste = async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Buscar primeiro funcionário
        const empResult = await client.query('SELECT id FROM employees WHERE client_id = $1 LIMIT 1', [req.user.clientId]);
        const employeeId = empResult.rows[0]?.id || req.user.clientId;
        
        // Gerar número da NF
        const numeroResult = await client.query('SELECT gerar_numero_nf($1) as numero', [req.user.clientId]);
        const numero_nf = numeroResult.rows[0].numero;
        
        // Criar nota fiscal de teste
        const nfResult = await client.query(`
            INSERT INTO notas_fiscais (client_id, employee_id, numero_nf, tipo, cliente_fornecedor_nome, 
                                       data_emissao, valor_total, observacoes)
            VALUES ($1, $2, $3, 'saida', 'Cliente Teste', CURRENT_DATE, 150.00, 'Nota fiscal de teste gerada automaticamente') 
            RETURNING *
        `, [req.user.clientId, employeeId, numero_nf]);
        
        const notaFiscal = nfResult.rows[0];
        
        // Criar itens de teste
        const itensTeste = [
            { nome: 'Produto A', quantidade: 2, valor_unitario: 50.00, valor_total: 100.00 },
            { nome: 'Produto B', quantidade: 1, valor_unitario: 50.00, valor_total: 50.00 }
        ];
        
        for (const item of itensTeste) {
            await client.query(`
                INSERT INTO itens_nota_fiscal (nota_fiscal_id, produto_nome, quantidade, 
                                               valor_unitario, valor_total, cfop, cst)
                VALUES ($1, $2, $3, $4, $5, '5102', '000')
            `, [notaFiscal.id, item.nome, item.quantidade, item.valor_unitario, item.valor_total]);
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            message: `Nota fiscal de teste criada com sucesso! Número: ${numero_nf}`,
            notaFiscal: {
                id: notaFiscal.id,
                numero: numero_nf,
                tipo: 'saida',
                cliente: 'Cliente Teste',
                valor_total: 150.00,
                itens: itensTeste.length
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao criar nota fiscal de teste.' });
    } finally {
        client.release();
    }
};

// ENDPOINTS PARA VITRINE (MARKETPLACE)
exports.getVitrinePublica = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                pv.id, pv.nome, pv.descricao, pv.preco, pv.quantidade, pv.unidade,
                pv.categoria, pv.fotos, pv.latitude, pv.longitude, pv.endereco,
                pv.disponivel, pv.whatsapp, pv.produtor_nome as produtor,
                pv.created_at, pv.updated_at
            FROM produtos_vitrine pv
            JOIN clients c ON pv.client_id = c.id
            WHERE pv.disponivel = true AND c.client_type = 'produtor'
            ORDER BY pv.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar produtos da vitrine.' });
    }
};

exports.getMeusProdutosVitrine = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM produtos_vitrine 
            WHERE client_id = $1 
            ORDER BY created_at DESC
        `, [req.user.clientId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao buscar seus produtos.' });
    }
};

exports.addProdutoVitrine = async (req, res) => {
    const { nome, descricao, preco, quantidade, unidade, categoria, fotos, latitude, longitude, endereco, disponivel } = req.body;
    
    if (!nome || !preco || !latitude || !longitude) {
        return res.status(400).json({ error: 'Nome, preço e localização são obrigatórios.' });
    }
    
    try {
        // Buscar dados do cliente para preencher automaticamente
        const clientResult = await db.query('SELECT company_name, contact_phone FROM clients WHERE id = $1', [req.user.clientId]);
        const client = clientResult.rows[0];
        
        const result = await db.query(`
            INSERT INTO produtos_vitrine (
                client_id, nome, descricao, preco, quantidade, unidade, categoria,
                fotos, latitude, longitude, endereco, disponivel, whatsapp, produtor_nome
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            req.user.clientId, nome, descricao, preco, quantidade, unidade || 'UN', categoria,
            fotos || [], latitude, longitude, endereco, disponivel !== false,
            client?.contact_phone || '', client?.company_name || 'Produtor'
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao adicionar produto.' });
    }
};

exports.updateProdutoVitrine = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, preco, quantidade, unidade, categoria, fotos, latitude, longitude, endereco, disponivel } = req.body;
    
    try {
        const fieldsToUpdate = [];
        const values = [];
        let queryIndex = 1;
        
        if (nome !== undefined) { fieldsToUpdate.push(`nome = $${queryIndex++}`); values.push(nome); }
        if (descricao !== undefined) { fieldsToUpdate.push(`descricao = $${queryIndex++}`); values.push(descricao); }
        if (preco !== undefined) { fieldsToUpdate.push(`preco = $${queryIndex++}`); values.push(preco); }
        if (quantidade !== undefined) { fieldsToUpdate.push(`quantidade = $${queryIndex++}`); values.push(quantidade); }
        if (unidade !== undefined) { fieldsToUpdate.push(`unidade = $${queryIndex++}`); values.push(unidade); }
        if (categoria !== undefined) { fieldsToUpdate.push(`categoria = $${queryIndex++}`); values.push(categoria); }
        if (fotos !== undefined) { fieldsToUpdate.push(`fotos = $${queryIndex++}`); values.push(fotos); }
        if (latitude !== undefined) { fieldsToUpdate.push(`latitude = $${queryIndex++}`); values.push(latitude); }
        if (longitude !== undefined) { fieldsToUpdate.push(`longitude = $${queryIndex++}`); values.push(longitude); }
        if (endereco !== undefined) { fieldsToUpdate.push(`endereco = $${queryIndex++}`); values.push(endereco); }
        if (disponivel !== undefined) { fieldsToUpdate.push(`disponivel = $${queryIndex++}`); values.push(disponivel); }
        
        fieldsToUpdate.push(`updated_at = NOW()`);
        values.push(id, req.user.clientId);
        
        const queryText = `UPDATE produtos_vitrine SET ${fieldsToUpdate.join(', ')} WHERE id = $${queryIndex++} AND client_id = $${queryIndex} RETURNING *`;
        
        const result = await db.query(queryText, values);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao atualizar produto.' });
    }
};

exports.deleteProdutoVitrine = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM produtos_vitrine WHERE id = $1 AND client_id = $2', [id, req.user.clientId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        res.json({ msg: 'Produto removido da vitrine com sucesso.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao remover produto.' });
    }
};

// ENDPOINT PARA MIGRAR DADOS DO LOCALSTORAGE PARA BANCO
exports.migrarVitrineProdutos = async (req, res) => {
    const { produtos } = req.body;
    
    if (!produtos || !Array.isArray(produtos)) {
        return res.status(400).json({ error: 'Lista de produtos é obrigatória.' });
    }
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        let migrados = 0;
        
        for (const produto of produtos) {
            // Verificar se o produto já existe
            const existeResult = await client.query(
                'SELECT id FROM produtos_vitrine WHERE client_id = $1 AND nome = $2 AND latitude = $3 AND longitude = $4',
                [req.user.clientId, produto.nome, produto.latitude, produto.longitude]
            );
            
            if (existeResult.rowCount === 0) {
                await client.query(`
                    INSERT INTO produtos_vitrine (
                        client_id, nome, descricao, preco, quantidade, unidade, categoria,
                        fotos, latitude, longitude, endereco, disponivel, whatsapp, produtor_nome
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                `, [
                    req.user.clientId, produto.nome, produto.descricao || '', produto.preco, 
                    produto.quantidade, produto.unidade || 'UN', produto.categoria || '',
                    produto.fotos || [], produto.latitude, produto.longitude, 
                    produto.endereco || '', produto.disponivel !== false,
                    produto.whatsapp || '', produto.produtor || 'Produtor'
                ]);
                migrados++;
            }
        }
        
        await client.query('COMMIT');
        res.json({ msg: `${migrados} produtos migrados com sucesso!`, migrados });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro no servidor ao migrar produtos.' });
    } finally {
        client.release();
    }
};

exports.updateProfile = (req, res) => {
    upload.single('logo')(req, res, async function (err) {
        if (err) {
            return res.status(500).json({ error: "Erro no upload do logo." });
        }

        const { companyName, cnpjCpf, contactPhone, email, pix, website, 
                inscricaoEstadual, inscricaoMunicipal, cep, enderecoRua, enderecoNumero, 
                enderecoBairro, enderecoCidade, enderecoUf, corTema } = req.body;
        const clientId = req.user.clientId;

        try {
            const oldProfile = await db.query('SELECT logo_path FROM clients WHERE id = $1', [clientId]);
            
            let newLogoPath = null;
            
            if (req.file) {
                if (oldProfile.rows[0] && oldProfile.rows[0].logo_path) {
                    await db.query('UPDATE clients SET logo_backup_path = logo_path, logo_backup_date = NOW() WHERE id = $1', [clientId]);
                }
                const s3Response = await uploadToS3(req.file, clientId, 'logos');
                newLogoPath = s3Response.Key;
            }
            
            // Gerar endereço completo automaticamente
            let fullAddress = '';
            if (enderecoRua || enderecoCidade) {
                const partes = [];
                if (enderecoRua) partes.push(enderecoRua);
                if (enderecoNumero) partes.push(enderecoNumero);
                if (enderecoBairro) partes.push(enderecoBairro);
                if (enderecoCidade) partes.push(enderecoCidade);
                if (enderecoUf) partes.push(enderecoUf);
                if (cep) partes.push(`CEP: ${cep}`);
                fullAddress = partes.join(', ');
            }
            
            const fieldsToUpdate = [];
            const values = [];
            let queryIndex = 1;

            const fieldMappings = {
                companyName: 'company_name',
                cnpjCpf: 'cnpj_cpf',
                contactPhone: 'contact_phone',
                email: 'email',
                pix: 'pix',
                website: 'website',
                inscricaoEstadual: 'inscricao_estadual',
                inscricaoMunicipal: 'inscricao_municipal',
                cep: 'cep',
                enderecoRua: 'endereco_rua',
                enderecoNumero: 'endereco_numero',
                enderecoBairro: 'endereco_bairro',
                enderecoCidade: 'endereco_cidade',
                enderecoUf: 'endereco_uf',
                corTema: 'cor_tema'
            };

            Object.entries(fieldMappings).forEach(([reqField, dbField]) => {
                if (req.body[reqField] !== undefined) {
                    fieldsToUpdate.push(`${dbField} = $${queryIndex++}`);
                    values.push(req.body[reqField]);
                }
            });
            
            // Atualizar endereço completo automaticamente
            if (fullAddress) {
                fieldsToUpdate.push(`full_address = $${queryIndex++}`);
                values.push(fullAddress);
            }
            
            if (newLogoPath) {
                fieldsToUpdate.push(`logo_path = $${queryIndex++}`);
                values.push(newLogoPath);
            }

            if (fieldsToUpdate.length === 0) {
                return res.status(200).json({ msg: 'Nenhum dado para atualizar.' });
            }

            values.push(clientId);
            
            const queryText = `UPDATE clients SET ${fieldsToUpdate.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
            
            const result = await db.query(queryText, values);

            const updatedProfile = result.rows[0];
            if (updatedProfile.logo_path) {
                updatedProfile.logo_url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${updatedProfile.logo_path}`;
            }

            res.json({ msg: 'Perfil atualizado com sucesso!', updatedProfile: updatedProfile });

        } catch (dbErr) {
            console.error("Erro ao atualizar perfil:", dbErr);
            res.status(500).json({ error: 'Erro ao atualizar o perfil na base de dados.' });
        }
    });
};