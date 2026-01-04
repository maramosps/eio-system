const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');

router.use(requireAdmin);

router.get('/users', (req, res) => res.json({ users: [] }));
router.get('/stats', (req, res) => res.json({ stats: {} }));
router.get('/logs', (req, res) => res.json({ logs: [] }));

module.exports = router;
