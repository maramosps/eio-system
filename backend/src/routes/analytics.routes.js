const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/overview', analyticsController.getOverview);
router.get('/best-posts', analyticsController.getBestPosts);
router.get('/best-times', analyticsController.getBestTimes);
router.get('/growth', analyticsController.getGrowthAnalytics);
router.get('/export', analyticsController.exportReport);

module.exports = router;
