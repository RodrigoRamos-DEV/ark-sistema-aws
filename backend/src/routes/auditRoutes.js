const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const db = require('../config/db');

// Registrar log de auditoria
router.post('/log', auth, async (req, res) => {
  try {
    const { action, entity, entityId, oldData, newData, timestamp, userAgent, ip } = req.body;
    
    await db.query(`
      INSERT INTO audit_logs (
        client_id, user_id, action, entity, entity_id, 
        old_data, new_data, timestamp, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      req.user.clientId,
      req.user.userId,
      action,
      entity,
      entityId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      timestamp,
      userAgent,
      ip
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao registrar audit log' });
  }
});

// Buscar logs de auditoria
router.get('/logs', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, entity, action, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT al.*, u.email as user_email 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.client_id = $1
    `;
    const params = [req.user.clientId];
    let paramIndex = 2;

    if (entity) {
      query += ` AND al.entity = $${paramIndex++}`;
      params.push(entity);
    }

    if (action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    if (startDate) {
      query += ` AND al.timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND al.timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    res.json({
      logs: result.rows,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rowCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

module.exports = router;