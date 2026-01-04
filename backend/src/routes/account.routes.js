const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({ accounts: [] }));
router.post('/', (req, res) => res.json({ message: 'Account added' }));
router.delete('/:id', (req, res) => res.json({ message: 'Account removed' }));

module.exports = router;
