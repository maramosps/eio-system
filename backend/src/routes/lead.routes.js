const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { authenticate } = require('../middlewares/auth');

// Rotas de Leads (CRM)
router.get('/', authenticate, leadController.list);
router.post('/batch', authenticate, leadController.batchUpsert);
router.patch('/:id', authenticate, leadController.update);

module.exports = router;
