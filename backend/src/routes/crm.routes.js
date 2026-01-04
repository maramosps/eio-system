const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crm.controller');

router.get('/', crmController.getLeads);
router.post('/', crmController.createLead);
router.get('/stats', crmController.getStats);
router.get('/:id', crmController.getLead);
router.put('/:id', crmController.updateLead);
router.delete('/:id', crmController.deleteLead);
router.post('/:id/interactions', crmController.addInteraction);

module.exports = router;
