const express = require('express');
const router = express.Router();

// Rota vazia - calendário removido
router.get('/', (req, res) => {
    res.status(404).json({ error: 'Calendário não disponível' });
});

module.exports = router;