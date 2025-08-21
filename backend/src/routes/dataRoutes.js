const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/authMiddleware');

// ROTA PÚBLICA (sem autenticação)
router.get('/vitrine-publica', dataController.getVitrinePublica);

router.use(authMiddleware);

// --- NOVAS ROTAS PARA O PERFIL ---
router.get('/profile', dataController.getProfile);
router.put('/profile', dataController.updateProfile);

// Rotas de Funcionários
router.get('/employees', dataController.getEmployees);
router.post('/employees', dataController.addEmployee);
router.put('/employees/:id', dataController.updateEmployee);
router.delete('/employees/:id', dataController.deleteEmployee);

// Rotas para Itens de Cadastro
router.get('/items', dataController.getAllItems);
router.post('/items', dataController.addItem);
router.put('/items/:id', dataController.updateItem);
router.delete('/items/:id', dataController.deleteItem);

// Rotas de Transações
router.get('/transactions', dataController.getTransactions);
router.post('/transactions', dataController.addTransaction);
router.put('/transactions/:id', dataController.updateTransaction);
router.delete('/transactions/:id', dataController.deleteTransaction);
router.post('/transactions/batch-delete', dataController.batchDeleteTransactions);

// Rota para Upload de Anexos
router.post('/transactions/:transactionId/attach', dataController.addAttachment);

// Rota para Exclusão de Anexos
router.delete('/attachments/:attachmentId', dataController.deleteAttachment);

// Rota para o Relatório
router.post('/generate-report', dataController.generateReport);

// NOVAS ROTAS PARA PRODUTOS UNIFICADOS
router.get('/produtos', dataController.getProdutos);
router.post('/produtos', dataController.addProduto);
router.put('/produtos/:id', dataController.updateProduto);
router.delete('/produtos/:id', dataController.deleteProduto);

// ROTAS PARA PEDIDOS
router.post('/pedidos', dataController.createPedido);
router.get('/pedidos', dataController.getPedidos);
router.get('/pedidos/:id', dataController.getPedidoDetalhes);

// ROTAS PARA NOTAS FISCAIS
router.get('/notas-fiscais', dataController.getNotasFiscais);
router.post('/notas-fiscais', dataController.createNotaFiscal);
router.get('/notas-fiscais/:id', dataController.getNotaFiscalDetalhes);
router.put('/notas-fiscais/:id', dataController.updateNotaFiscal);
router.delete('/notas-fiscais/:id', dataController.deleteNotaFiscal);

// ROTA DE TESTE
router.post('/notas-fiscais/teste', dataController.criarNotaFiscalTeste);

// ROTA PARA GERAR PDF
router.get('/notas-fiscais/:id/pdf', dataController.gerarPdfNotaFiscal);

// ROTA PARA DASHBOARD
router.get('/dashboard', dataController.getDashboardData);

// ROTA PARA BUSCA GLOBAL
router.get('/search', dataController.globalSearch);

// ROTAS PARA VITRINE (MARKETPLACE)
router.get('/vitrine/meus-produtos', dataController.getMeusProdutosVitrine);
router.post('/vitrine/produtos', dataController.addProdutoVitrine);
router.put('/vitrine/produtos/:id', dataController.updateProdutoVitrine);
router.delete('/vitrine/produtos/:id', dataController.deleteProdutoVitrine);
router.post('/vitrine/migrar', dataController.migrarVitrineProdutos);

module.exports = router;