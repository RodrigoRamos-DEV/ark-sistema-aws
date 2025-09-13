const express = require('express');
const router = express.Router();
const asaasController = require('../controllers/asaasController');
const webhookController = require('../controllers/webhookController');

// Testar conexão
router.get('/test', asaasController.testConnection);

// Clientes
router.post('/customers', asaasController.createCustomer);

// Cobranças
router.post('/payments', asaasController.createPayment);
router.get('/payments', asaasController.getPayments);
router.get('/payments/:id', asaasController.getPayment);

// Webhook (sem autenticação para receber do Asaas)
router.post('/webhook', webhookController.handleAsaasWebhook);

module.exports = router;