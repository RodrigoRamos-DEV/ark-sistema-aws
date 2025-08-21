const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota de Login (pública)
router.post('/login', authController.login);

// Rota de Registo (pública)
router.post('/register', authController.registerClient);

// Rota de "Esqueci a Senha" (pública)
router.post('/forgot-password', authController.forgotPassword);

// Rota de Redefinição de Senha (pública)
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;