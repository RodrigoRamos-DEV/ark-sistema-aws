const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const db = require('../config/db');

// Verificar status da licença
router.get('/license-status', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT license_expires_at, license_status FROM clients WHERE id = $1',
      [req.user.clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { license_expires_at, license_status } = result.rows[0];
    const expiresAt = new Date(license_expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    let status = 'active';
    if (now > expiresAt) {
      status = 'expired';
    } else if (daysRemaining <= 5) {
      status = 'expiring';
    }

    res.json({
      status,
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: license_expires_at,
      licenseStatus: license_status
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

module.exports = router;