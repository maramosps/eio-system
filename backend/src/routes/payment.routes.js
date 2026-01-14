/*
 * E.I.O - Payment Routes
 * Rotas para gerenciamento de pagamentos
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// User routes (authenticated)
router.post('/submit', authenticate, paymentController.submitPayment);
router.get('/pending', authenticate, paymentController.checkPending);

// Admin routes (protected)
router.get('/admin/pending', authenticate, requireAdmin, paymentController.getPendingPayments);
router.get('/admin/details/:id', authenticate, requireAdmin, paymentController.getPaymentDetails);
router.post('/admin/approve/:id', authenticate, requireAdmin, paymentController.approvePayment);
router.post('/admin/reject/:id', authenticate, requireAdmin, paymentController.rejectPayment);
router.get('/admin/summary', authenticate, requireAdmin, paymentController.getFinancialSummary);
router.get('/admin/history', authenticate, requireAdmin, paymentController.getPaymentHistory);

module.exports = router;
