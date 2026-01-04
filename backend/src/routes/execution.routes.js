const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ executions: [] }));
router.get('/:id', (req, res) => res.json({ execution: {} }));
router.post('/log', (req, res) => res.json({ success: true }));

module.exports = router;
