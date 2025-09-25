const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware, adminController.ensureAdmin);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/clients', adminController.getAllClients);
router.post('/clients', adminController.createClient);
router.put('/clients/:id', adminController.updateClient);
router.delete('/clients/:id', adminController.deleteClient);
router.put('/clients/:id/renew', adminController.renewClientLicense);
router.put('/clients/:id/renew-subscription', adminController.renewSubscription);
router.get('/clients/:id/token', adminController.getClientToken);
router.get('/clients/:id/profile', adminController.getClientProfile);
router.get('/clients/:id/user-profile', adminController.getUserProfile);

router.get('/notifications', adminController.getNotifications);
router.post('/notifications', adminController.createNotification);
router.delete('/notifications/:id', adminController.deleteNotification);

module.exports = router;