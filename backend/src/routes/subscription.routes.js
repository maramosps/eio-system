const express = require('express');
const router = express.Router();

// Placeholder routes - implementar conforme necessário
router.get('/', (req, res) => res.json({ message: 'Subscriptions API' }));
router.post('/create', (req, res) => res.json({ message: 'Create subscription' }));
router.post('/cancel', (req, res) => res.json({ message: 'Cancel subscription' }));

module.exports = router;
