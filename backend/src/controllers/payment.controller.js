/*
 * E.I.O - Payment Controller
 * Gerencia submissão e aprovação de comprovantes de pagamento
 */

const { User, Subscription } = require('../models');

// Alíquota de impostos Brasil 2026
const TAX_RATE = 0.1215; // 12,15%

// In-memory storage for payments (in production, use database + cloud storage)
const pendingPayments = [];
const paymentHistory = [];

const paymentController = {
    /**
     * Submit payment proof (user action)
     */
    async submitPayment(req, res) {
        try {
            const userId = req.user.id;
            const { plan, price, method, file, fileName } = req.body;

            if (!file || !plan) {
                return res.status(400).json({ message: 'Comprovante e plano são obrigatórios' });
            }

            // Calculate tax values
            const grossValue = parseFloat(price) || (plan === 'anual' ? 3999.00 : 399.90);
            const taxValue = parseFloat((grossValue * TAX_RATE).toFixed(2));
            const netProfit = parseFloat((grossValue - taxValue).toFixed(2));

            // Get user data
            const user = await User.findByPk(userId);

            const payment = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                userId,
                userEmail: user?.email || req.user.email,
                userName: user?.name || 'Usuário',
                userInstagram: user?.instagram_handle || '',
                plan,
                planLabel: plan === 'anual' ? 'Anual Premium' : 'Mensal',
                method,
                grossValue,
                taxValue,
                netProfit,
                file, // base64 encoded
                fileName,
                status: 'pending', // pending, approved, rejected
                submittedAt: new Date().toISOString(),
                reviewedAt: null,
                reviewedBy: null,
                rejectionReason: null
            };

            // Check if user already has pending payment
            const existingIndex = pendingPayments.findIndex(p => p.userId === userId && p.status === 'pending');
            if (existingIndex >= 0) {
                // Update existing
                pendingPayments[existingIndex] = payment;
            } else {
                pendingPayments.push(payment);
            }

            console.log(`💳 New payment submitted: ${user?.email} - R$ ${grossValue} (${plan})`);

            res.json({
                success: true,
                message: 'Comprovante enviado com sucesso! Aguarde a aprovação.',
                paymentId: payment.id
            });
        } catch (error) {
            console.error('Error submitting payment:', error);
            res.status(500).json({ message: 'Erro ao enviar comprovante' });
        }
    },

    /**
     * Check if user has pending payment
     */
    async checkPending(req, res) {
        try {
            const userId = req.user.id;
            const pending = pendingPayments.find(p => p.userId === userId && p.status === 'pending');

            if (pending) {
                res.json({
                    pending: true,
                    payment: {
                        plan: pending.planLabel,
                        method: pending.method,
                        sentAt: new Date(pending.submittedAt).toLocaleString('pt-BR')
                    }
                });
            } else {
                res.json({ pending: false });
            }
        } catch (error) {
            console.error('Error checking pending payment:', error);
            res.status(500).json({ message: 'Erro ao verificar pagamento' });
        }
    },

    /**
     * Get all pending payments (admin)
     */
    async getPendingPayments(req, res) {
        try {
            const pending = pendingPayments.filter(p => p.status === 'pending');

            res.json({
                success: true,
                payments: pending.map(p => ({
                    ...p,
                    file: undefined // Don't send file in list
                })),
                count: pending.length
            });
        } catch (error) {
            console.error('Error fetching pending payments:', error);
            res.status(500).json({ message: 'Erro ao buscar pagamentos' });
        }
    },

    /**
     * Get payment details including file (admin)
     */
    async getPaymentDetails(req, res) {
        try {
            const { id } = req.params;
            const payment = pendingPayments.find(p => p.id === id);

            if (!payment) {
                return res.status(404).json({ message: 'Pagamento não encontrado' });
            }

            res.json({
                success: true,
                payment
            });
        } catch (error) {
            console.error('Error fetching payment details:', error);
            res.status(500).json({ message: 'Erro ao buscar detalhes' });
        }
    },

    /**
     * Approve payment (admin)
     */
    async approvePayment(req, res) {
        try {
            const { id } = req.params;
            const adminEmail = req.user?.email || 'admin';

            const paymentIndex = pendingPayments.findIndex(p => p.id === id);
            if (paymentIndex < 0) {
                return res.status(404).json({ message: 'Pagamento não encontrado' });
            }

            const payment = pendingPayments[paymentIndex];

            // Calculate expiration based on plan
            const now = new Date();
            const daysToAdd = payment.plan === 'anual' ? 365 : 30;
            const expirationDate = new Date(now);
            expirationDate.setDate(expirationDate.getDate() + daysToAdd);

            // Update or create subscription
            let subscription = await Subscription.findOne({ where: { user_id: payment.userId } });

            if (subscription) {
                await subscription.update({
                    status: 'active',
                    plan: payment.plan === 'anual' ? 'premium' : 'professional',
                    current_period_start: now,
                    current_period_end: expirationDate
                });
            } else {
                subscription = await Subscription.create({
                    user_id: payment.userId,
                    status: 'active',
                    plan: payment.plan === 'anual' ? 'premium' : 'professional',
                    current_period_start: now,
                    current_period_end: expirationDate
                });
            }

            // Update payment status
            payment.status = 'approved';
            payment.reviewedAt = new Date().toISOString();
            payment.reviewedBy = adminEmail;

            // Move to history
            paymentHistory.push({ ...payment });
            pendingPayments.splice(paymentIndex, 1);

            console.log(`✅ Payment approved: ${payment.userEmail} - R$ ${payment.grossValue} by ${adminEmail}`);

            res.json({
                success: true,
                message: `Pagamento aprovado! Acesso liberado por ${daysToAdd} dias.`,
                netProfit: payment.netProfit
            });
        } catch (error) {
            console.error('Error approving payment:', error);
            res.status(500).json({ message: 'Erro ao aprovar pagamento' });
        }
    },

    /**
     * Reject payment (admin)
     */
    async rejectPayment(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminEmail = req.user?.email || 'admin';

            const paymentIndex = pendingPayments.findIndex(p => p.id === id);
            if (paymentIndex < 0) {
                return res.status(404).json({ message: 'Pagamento não encontrado' });
            }

            const payment = pendingPayments[paymentIndex];

            // Update payment status
            payment.status = 'rejected';
            payment.reviewedAt = new Date().toISOString();
            payment.reviewedBy = adminEmail;
            payment.rejectionReason = reason || 'Comprovante inválido';

            // Move to history
            paymentHistory.push({ ...payment });
            pendingPayments.splice(paymentIndex, 1);

            console.log(`❌ Payment rejected: ${payment.userEmail} - Reason: ${reason}`);

            res.json({
                success: true,
                message: 'Pagamento rejeitado. O usuário será notificado.'
            });
        } catch (error) {
            console.error('Error rejecting payment:', error);
            res.status(500).json({ message: 'Erro ao rejeitar pagamento' });
        }
    },

    /**
     * Get financial summary (admin)
     */
    async getFinancialSummary(req, res) {
        try {
            const approvedPayments = paymentHistory.filter(p => p.status === 'approved');

            const totalGross = approvedPayments.reduce((sum, p) => sum + p.grossValue, 0);
            const totalTax = approvedPayments.reduce((sum, p) => sum + p.taxValue, 0);
            const totalNetProfit = approvedPayments.reduce((sum, p) => sum + p.netProfit, 0);

            // Current month
            const now = new Date();
            const currentMonth = approvedPayments.filter(p => {
                const date = new Date(p.reviewedAt);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            });

            const monthlyGross = currentMonth.reduce((sum, p) => sum + p.grossValue, 0);
            const monthlyTax = currentMonth.reduce((sum, p) => sum + p.taxValue, 0);
            const monthlyNetProfit = currentMonth.reduce((sum, p) => sum + p.netProfit, 0);

            res.json({
                success: true,
                summary: {
                    total: {
                        gross: totalGross,
                        tax: totalTax,
                        netProfit: totalNetProfit,
                        count: approvedPayments.length
                    },
                    monthly: {
                        gross: monthlyGross,
                        tax: monthlyTax,
                        netProfit: monthlyNetProfit,
                        count: currentMonth.length
                    },
                    pendingCount: pendingPayments.filter(p => p.status === 'pending').length,
                    taxRate: TAX_RATE * 100
                }
            });
        } catch (error) {
            console.error('Error fetching financial summary:', error);
            res.status(500).json({ message: 'Erro ao buscar resumo financeiro' });
        }
    },

    /**
     * Get payment history (admin)
     */
    async getPaymentHistory(req, res) {
        try {
            res.json({
                success: true,
                payments: paymentHistory.map(p => ({
                    ...p,
                    file: undefined // Don't send file
                }))
            });
        } catch (error) {
            console.error('Error fetching payment history:', error);
            res.status(500).json({ message: 'Erro ao buscar histórico' });
        }
    }
};

module.exports = paymentController;
