const express = require('express');
const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
    // Handle Stripe webhook
    res.json({ received: true });
});

router.post('/mercadopago', (req, res) => {
    // Handle Mercado Pago webhook  res.json({ received: true });
});

module.exports = router;
