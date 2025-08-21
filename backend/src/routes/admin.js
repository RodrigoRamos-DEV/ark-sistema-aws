const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

// @route   GET /api/admin/notifications
// @desc    Listar notificações admin
// @access  Private (Admin)
router.get('/notifications', auth, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const result = await pool.query(`
      SELECT * FROM admin_notifications 
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// @route   POST /api/admin/notifications
// @desc    Criar notificação admin
// @access  Private (Admin)
router.post('/notifications', auth, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const { title, message, type, target_audience } = req.body;

    const query = `
      INSERT INTO admin_notifications (title, message, type, target_audience, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [title, message, type || 'info', target_audience || 'all', req.user.id];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// @route   DELETE /api/admin/notifications/:id
// @desc    Deletar notificação admin
// @access  Private (Admin)
router.delete('/notifications/:id', auth, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const notificationId = req.params.id;
    
    // Validar se o ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(notificationId)) {
      return res.status(400).json({ message: 'ID de notificação inválido' });
    }

    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Primeiro, remover dispensas relacionadas
    await pool.query(
      'DELETE FROM dismissed_notifications WHERE notification_id = $1',
      [notificationId]
    );

    // Depois, remover a notificação
    const result = await pool.query(
      'DELETE FROM admin_notifications WHERE id = $1 RETURNING id',
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação removida com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    console.error('ID recebido:', req.params.id);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

// @route   GET /api/admin/notifications/client
// @desc    Buscar notificações para o cliente
// @access  Private
router.get('/notifications/client', auth, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const userType = req.user.clientType || 'empresa';

    const query = `
      SELECT an.* FROM admin_notifications an
      WHERE an.target_audience = 'all' OR an.target_audience = $1
      ORDER BY an.created_at DESC
    `;

    const result = await pool.query(query, [userType]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar notificações do cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// @route   POST /api/admin/notifications/dismiss
// @desc    Dispensar notificação
// @access  Private
router.post('/notifications/dismiss', auth, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const { notificationId } = req.body;

    const query = `
      INSERT INTO dismissed_notifications (user_id, notification_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, notification_id) DO NOTHING
      RETURNING *
    `;

    await pool.query(query, [req.user.id, notificationId]);

    res.json({ message: 'Notificação dispensada' });
  } catch (error) {
    console.error('Erro ao dispensar notificação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;