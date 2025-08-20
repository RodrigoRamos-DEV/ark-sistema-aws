const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const onlineStatusController = require('../controllers/onlineStatusController');

// Atualizar status online (usuários logados)
router.post('/heartbeat', auth, onlineStatusController.updateOnlineStatus);

// Remover status online (logout)
router.post('/logout', auth, onlineStatusController.removeOnlineStatus);

// Buscar status online de todos os clientes (admin)
router.get('/status', auth, onlineStatusController.getOnlineStatus);

module.exports = router;