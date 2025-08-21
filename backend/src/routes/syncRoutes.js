const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// Sincronizar transações do app
router.post('/transactions', authMiddleware, async (req, res) => {
    const { data } = req.body;
    const clientId = req.user.clientId;
    
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ success: false, message: 'Dados inválidos' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        let syncedCount = 0;

        for (const transaction of data) {
            const { employeeId, type, transactionDate, description, category, 
                    quantity, unitPrice, totalPrice, status, latitude, longitude } = transaction;

            await client.query(`
                INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, 
                                        category, quantity, unit_price, total_price, status, latitude, longitude)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [clientId, employeeId, type, transactionDate, description, category, 
                quantity, unitPrice, totalPrice, status, latitude, longitude]);
            
            syncedCount++;
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Transações sincronizadas', syncedCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao sincronizar transações' });
    } finally {
        client.release();
    }
});

// Sincronizar produtos do app
router.post('/products', authMiddleware, async (req, res) => {
    const { data } = req.body;
    const clientId = req.user.clientId;
    
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ success: false, message: 'Dados inválidos' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        let syncedCount = 0;

        for (const product of data) {
            const { name, codigo, unidade, categoria, precoVenda, precoCusto, 
                    estoqueAtual, estoqueMinimo, observacoes } = product;

            await client.query(`
                INSERT INTO items (client_id, type, name, codigo, unidade, categoria, 
                                 preco_venda, preco_custo, estoque_atual, estoque_minimo, observacoes, ativo)
                VALUES ($1, 'produto', $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
            `, [clientId, name, codigo, unidade, categoria, precoVenda, precoCusto, 
                estoqueAtual, estoqueMinimo, observacoes]);
            
            syncedCount++;
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Produtos sincronizados', syncedCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao sincronizar produtos' });
    } finally {
        client.release();
    }
});

// Upload de fotos do app
router.post('/photos', authMiddleware, async (req, res) => {
    // Implementar upload de fotos se necessário
    res.json({ success: true, message: 'Upload de fotos não implementado ainda' });
});

module.exports = router;