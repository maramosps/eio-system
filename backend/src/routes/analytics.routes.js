const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth');

// Rotas públicas (com autenticação opcional)
router.get('/overview', authenticate, analyticsController.getOverview);
router.get('/best-posts', authenticate, analyticsController.getBestPosts);
router.get('/best-times', authenticate, analyticsController.getBestTimes);
router.get('/growth', authenticate, analyticsController.getGrowthAnalytics);
router.get('/export', authenticate, analyticsController.exportReport);

// Novas rotas para integração com a extensão
router.get('/dashboard', authenticate, analyticsController.getDashboard);
router.post('/log', authenticate, analyticsController.logAction);

module.exports = router;

