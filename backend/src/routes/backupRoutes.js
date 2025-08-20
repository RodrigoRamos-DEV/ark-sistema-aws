const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const db = require('../config/db');

// Criar backup
router.post('/create', auth, async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    // Buscar todos os dados do cliente
    const [
      transactions,
      items,
      employees,
      clientData
    ] = await Promise.all([
      db.query('SELECT * FROM transactions WHERE client_id = $1', [clientId]),
      db.query('SELECT * FROM items WHERE client_id = $1', [clientId]),
      db.query('SELECT * FROM employees WHERE client_id = $1', [clientId]),
      db.query('SELECT * FROM clients WHERE id = $1', [clientId])
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      clientId,
      data: {
        transactions: transactions.rows,
        items: items.rows,
        employees: employees.rows,
        client: clientData.rows[0]
      }
    };

    // Salvar backup no banco (opcional)
    await db.query(
      'INSERT INTO backups (client_id, backup_data, created_at) VALUES ($1, $2, NOW())',
      [clientId, JSON.stringify(backup)]
    );

    res.json({ 
      success: true, 
      message: 'Backup criado com sucesso',
      timestamp: backup.timestamp
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao criar backup' });
  }
});

// Download backup
router.get('/download', auth, async (req, res) => {
  try {
    const clientId = req.user.clientId;
    
    const [
      transactions,
      items,
      employees,
      clientData
    ] = await Promise.all([
      db.query('SELECT * FROM transactions WHERE client_id = $1', [clientId]),
      db.query('SELECT * FROM items WHERE client_id = $1', [clientId]),
      db.query('SELECT * FROM employees WHERE client_id = $1', [clientId]),
      db.query('SELECT * FROM clients WHERE id = $1', [clientId])
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      clientId,
      data: {
        transactions: transactions.rows,
        items: items.rows,
        employees: employees.rows,
        client: clientData.rows[0]
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao baixar backup' });
  }
});

module.exports = router;