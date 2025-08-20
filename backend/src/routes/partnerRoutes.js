const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../controllers/adminController').ensureAdmin;

router.use(authMiddleware, adminMiddleware);

// Rotas para Sócios
router.get('/', partnerController.getPartners);
router.post('/vendedores', partnerController.createVendedor);
router.put('/vendedores/:id', partnerController.updateVendedor);
router.delete('/vendedores/:id', partnerController.deleteVendedor);
router.get('/comissoes', partnerController.getComissoes);
router.post('/pagamentos/marcar-pago', partnerController.marcarComissaoPaga);
router.post('/pagamentos/marcar-pendente', partnerController.marcarComissaoPendente);
router.get('/pagamentos/status', partnerController.getStatusPagamentos);
router.post('/reverter-retirada', partnerController.reverterRetirada);
router.get('/dashboard-financeiro', partnerController.getDashboardFinanceiro);
router.delete('/limpar-dados', partnerController.limparDados);
router.get('/teste-estrutura', partnerController.testeEstrutura);

// Rotas para Pagamentos
router.get('/payments', partnerController.getPayments);
router.get('/payment-vendors/:paymentId', partnerController.getPaymentVendors);
router.post('/payments', partnerController.addPayment);
router.put('/payments/:id', partnerController.updatePayment);
router.delete('/payments/:id', partnerController.deletePayment);

// Rotas para Retiradas
router.get('/withdrawals', partnerController.getWithdrawals);
router.post('/withdrawals', partnerController.addWithdrawal);
router.put('/withdrawals/:id', partnerController.updateWithdrawal);   // <-- NOVA ROTA DE EDIÇÃO
router.delete('/withdrawals/:id', partnerController.deleteWithdrawal); // <-- NOVA ROTA DE EXCLUSÃO

module.exports = router;