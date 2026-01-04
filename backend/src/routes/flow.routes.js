const express = require('express');
const router = express.Router();
const flowController = require('../controllers/flow.controller');

router.get('/', flowController.getFlows);
router.post('/', flowController.createFlow);
router.get('/:id', flowController.getFlow);
router.put('/:id', flowController.updateFlow);
router.delete('/:id', flowController.deleteFlow);
router.post('/:id/start', flowController.startFlow);
router.post('/:id/pause', flowController.pauseFlow);
router.post('/:id/stop', flowController.stopFlow);
router.post('/:id/duplicate', flowController.duplicateFlow);

module.exports = router;
