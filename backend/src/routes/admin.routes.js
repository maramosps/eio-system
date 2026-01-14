const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Protect all routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.listUsers);
router.get('/finances', adminController.getFinanceData);
router.get('/subscriptions', adminController.getSubscriptionDetails);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/grant-access', adminController.grantAccess);
router.post('/users/:id/suspend', adminController.suspendAccess);
router.get('/logs', adminController.getLogs);
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
