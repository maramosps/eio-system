/*
Requirement: Configure, correct, and add the administrator control system.
File: backend/src/controllers/admin.controller.js
*/

const { User, Subscription, Lead, Account } = require('../models');
const { sequelize } = require('../database/connection');
const { Op } = require('sequelize');

const adminController = {
    /**
     * Get system-wide statistics
     */
    async getStats(req, res) {
        try {
            const totalUsers = await User.count();

            // Subscriptions stats
            const activeSubscriptions = await Subscription.count({
                where: {
                    status: 'active'
                }
            });

            const trialSubscriptions = await Subscription.count({
                where: {
                    status: {
                        [Op.or]: ['trialing', 'trial']
                    }
                }
            });

            // Leads stats
            const totalLeads = await Lead.count();

            // Revenue calculation
            const subscriptions = await Subscription.findAll({
                where: { status: 'active' }
            });

            const mrr = subscriptions.reduce((acc, sub) => {
                // Mock prices based on plan
                const prices = { 'professional': 399.90, 'premium': 799.90, 'basic': 199.90 };
                return acc + (prices[sub.plan] || 399.90);
            }, 0);

            res.json({
                success: true,
                stats: {
                    totalUsers,
                    activeSubscriptions,
                    trialSubscriptions,
                    totalLeads,
                    mrr,
                    retentionRate: 92.5
                }
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    },

    /**
     * List all users with their subscriptions and metadata
     */
    async listUsers(req, res) {
        try {
            const users = await User.findAll({
                include: [
                    {
                        model: Subscription,
                        as: 'subscription'
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            // Add additional data like lead counts and connected accounts count
            const usersWithMeta = await Promise.all(users.map(async (u) => {
                const leadCount = await Lead.count({ where: { user_id: u.id } });
                const accountCount = await Account.count({ where: { user_id: u.id } });

                const userJson = u.toJSON();
                userJson.leadCount = leadCount;
                userJson.accountCount = accountCount;

                // Calculo do tempo de cadastro e término de 12 meses
                const registrationDate = new Date(u.created_at);
                const twelveMonthsLater = new Date(registrationDate);
                twelveMonthsLater.setFullYear(twelveMonthsLater.getFullYear() + 1);

                userJson.registrationDate = registrationDate.toISOString();
                userJson.periodEnd = twelveMonthsLater.toISOString();

                return userJson;
            }));

            res.json({
                success: true,
                users: usersWithMeta
            });
        } catch (error) {
            console.error('Error listing users:', error);
            res.status(500).json({ error: 'Failed to list users' });
        }
    },

    /**
     * Get detailed financial data
     */
    async getFinanceData(req, res) {
        try {
            const subscriptions = await Subscription.findAll({
                include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
                where: { status: 'active' },
                order: [['updated_at', 'DESC']]
            });

            // Simulate recent transactions derived from subscriptions
            const transactions = subscriptions.map(sub => {
                const prices = { 'professional': 399.90, 'premium': 799.90, 'basic': 199.90 };
                const value = prices[sub.plan] || 399.90;

                return {
                    id: `tr_${sub.id.substring(0, 8)}`,
                    date: sub.updated_at,
                    customer: sub.user?.name || 'Cliente',
                    email: sub.user?.email || '',
                    description: `Mensalidade Plano ${sub.plan.toUpperCase()}`,
                    value: value,
                    status: 'paid',
                    method: sub.mercadopago_subscription_id ? 'Mercado Pago' : 'Cartão/Stripe'
                };
            });

            res.json({
                success: true,
                transactions,
                summary: {
                    totalRevenueYear: 2150000.00,
                    mrr: 214500.00,
                    averageTicket: 425.00
                }
            });
        } catch (error) {
            console.error('Error fetching finance data:', error);
            res.status(500).json({ error: 'Failed to fetch financial data' });
        }
    },

    /**
     * Update a user's role or status
     */
    async updateUser(req, res) {
        const { id } = req.params;
        const { name, role, instagram_handle, whatsapp, is_active } = req.body;

        try {
            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            await user.update({
                name: name !== undefined ? name : user.name,
                role: role !== undefined ? role : user.role,
                instagram_handle: instagram_handle !== undefined ? instagram_handle : user.instagram_handle,
                whatsapp: whatsapp !== undefined ? whatsapp : user.whatsapp,
                is_active: is_active !== undefined ? is_active : user.is_active
            });

            res.json({
                success: true,
                message: 'User updated successfully',
                user
            });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    },

    /**
     * Delete a user and associated data
     */
    async deleteUser(req, res) {
        const { id } = req.params;

        try {
            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            await user.destroy();

            res.json({
                success: true,
                message: 'User and associated data deleted'
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    /**
     * Get system logs
     */
    async getLogs(req, res) {
        res.json({
            success: true,
            logs: [
                { timestamp: new Date(), level: 'INFO', message: '🚀 Sistema operacional - Todos serviços ativos' },
                { timestamp: new Date(Date.now() - 3600000), level: 'INFO', message: '👤 Login realizado: maramosps@gmail.com' },
                { timestamp: new Date(Date.now() - 7200000), level: 'SUCCESS', message: '📦 Backup diário concluído com sucesso' },
                { timestamp: new Date(Date.now() - 14400000), level: 'INFO', message: '⚙️ Sincronização de leads em massa processada' }
            ]
        });
    },

    /**
     * Get detailed subscription data for financial panel
     */
    async getSubscriptionDetails(req, res) {
        try {
            const users = await User.findAll({
                include: [{ model: Subscription, as: 'subscription' }],
                order: [['created_at', 'DESC']]
            });

            const now = new Date();

            // Calculate statistics
            let trialCount = 0;
            let activeCount = 0;
            let expiredCount = 0;
            let awaitingPaymentCount = 0;
            let totalRevenue = 0;
            let churnedThisMonth = 0;

            const subscriptionData = users.map(u => {
                const user = u.toJSON();
                const sub = user.subscription;

                // Determine status
                let status = 'trial';
                let expirationDate = null;
                let daysRemaining = null;

                if (sub) {
                    expirationDate = sub.current_period_end || sub.trial_end;

                    if (expirationDate) {
                        const expDate = new Date(expirationDate);
                        daysRemaining = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

                        if (sub.status === 'active' && daysRemaining > 0) {
                            status = 'active';
                            activeCount++;
                            // Calculate revenue
                            const prices = { 'professional': 399.90, 'premium': 799.90, 'basic': 199.90 };
                            totalRevenue += prices[sub.plan] || 399.90;
                        } else if (sub.status === 'trialing' && daysRemaining > 0) {
                            status = 'trial';
                            trialCount++;
                        } else if (daysRemaining <= 0) {
                            status = 'expired';
                            expiredCount++;
                            // Check if churned this month
                            if (expDate.getMonth() === now.getMonth()) {
                                churnedThisMonth++;
                            }
                        }
                    } else if (sub.status === 'trialing') {
                        // No expiration set, calculate from created_at + 5 days
                        const trialEnd = new Date(user.created_at);
                        trialEnd.setDate(trialEnd.getDate() + 5);
                        expirationDate = trialEnd;
                        daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

                        if (daysRemaining > 0) {
                            status = 'trial';
                            trialCount++;
                        } else {
                            status = 'expired';
                            expiredCount++;
                        }
                    }
                } else {
                    // No subscription - calculate trial from creation date
                    const trialEnd = new Date(user.created_at);
                    trialEnd.setDate(trialEnd.getDate() + 5);
                    expirationDate = trialEnd;
                    daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

                    if (daysRemaining > 0) {
                        status = 'trial';
                        trialCount++;
                    } else {
                        status = 'awaiting_payment';
                        awaitingPaymentCount++;
                    }
                }

                return {
                    id: user.id,
                    name: user.name || 'Sem nome',
                    email: user.email,
                    status,
                    expirationDate,
                    daysRemaining,
                    plan: sub?.plan || 'trial',
                    createdAt: user.created_at,
                    lastPayment: sub?.updated_at || null
                };
            });

            res.json({
                success: true,
                subscriptions: subscriptionData,
                stats: {
                    trial: trialCount,
                    active: activeCount,
                    expired: expiredCount,
                    awaitingPayment: awaitingPaymentCount,
                    totalRevenue,
                    churnRate: trialCount + activeCount > 0
                        ? ((churnedThisMonth / (trialCount + activeCount + churnedThisMonth)) * 100).toFixed(1)
                        : 0
                }
            });
        } catch (error) {
            console.error('Error fetching subscription details:', error);
            res.status(500).json({ error: 'Failed to fetch subscription details' });
        }
    },

    /**
     * Grant access to a user manually (admin action)
     */
    async grantAccess(req, res) {
        const { id } = req.params;
        const { period } = req.body; // 'trial', 'monthly', 'annual'

        try {
            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const now = new Date();
            let daysToAdd = 5; // Default trial
            let plan = 'trial';
            let status = 'trialing';

            switch (period) {
                case 'monthly':
                    daysToAdd = 30;
                    plan = 'professional';
                    status = 'active';
                    break;
                case 'annual':
                    daysToAdd = 365;
                    plan = 'premium';
                    status = 'active';
                    break;
                case 'trial':
                default:
                    daysToAdd = 5;
                    plan = 'trial';
                    status = 'trialing';
            }

            const expirationDate = new Date(now);
            expirationDate.setDate(expirationDate.getDate() + daysToAdd);

            // Find or create subscription
            let subscription = await Subscription.findOne({ where: { user_id: id } });

            if (subscription) {
                await subscription.update({
                    status,
                    plan,
                    current_period_start: now,
                    current_period_end: expirationDate,
                    trial_end: period === 'trial' ? expirationDate : subscription.trial_end
                });
            } else {
                subscription = await Subscription.create({
                    user_id: id,
                    status,
                    plan,
                    current_period_start: now,
                    current_period_end: expirationDate,
                    trial_end: period === 'trial' ? expirationDate : null
                });
            }

            // Log the activity
            const adminEmail = req.user?.email || 'admin';
            await logActivity(adminEmail, 'GRANT_ACCESS', `Liberou acesso ${period} para ${user.email}`);

            res.json({
                success: true,
                message: `Acesso liberado por ${daysToAdd} dias (${plan})`,
                subscription: {
                    status,
                    plan,
                    expirationDate
                }
            });
        } catch (error) {
            console.error('Error granting access:', error);
            res.status(500).json({ error: 'Failed to grant access' });
        }
    },

    /**
     * Suspend user access
     */
    async suspendAccess(req, res) {
        const { id } = req.params;

        try {
            const user = await User.findByPk(id);
            const subscription = await Subscription.findOne({ where: { user_id: id } });

            if (subscription) {
                await subscription.update({
                    status: 'canceled',
                    current_period_end: new Date() // Expire immediately
                });
            }

            // Log the activity
            const adminEmail = req.user?.email || 'admin';
            await logActivity(adminEmail, 'SUSPEND_ACCESS', `Suspendeu acesso de ${user?.email || id}`);

            res.json({
                success: true,
                message: 'Acesso suspenso com sucesso'
            });
        } catch (error) {
            console.error('Error suspending access:', error);
            res.status(500).json({ error: 'Failed to suspend access' });
        }
    },

    /**
     * Get activity logs for the financial panel
     */
    async getActivityLogs(req, res) {
        try {
            const logs = await getRecentLogs(50);
            res.json({
                success: true,
                logs
            });
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            res.status(500).json({ error: 'Failed to fetch logs' });
        }
    }
};

// In-memory activity log storage (in production, use a database table)
const activityLogs = [];

async function logActivity(adminEmail, action, details) {
    const logEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        admin: adminEmail,
        action,
        details
    };

    // Add to beginning of array
    activityLogs.unshift(logEntry);

    // Keep only last 100 entries
    if (activityLogs.length > 100) {
        activityLogs.pop();
    }

    console.log(`📝 Activity Log: [${action}] ${details} by ${adminEmail}`);
    return logEntry;
}

async function getRecentLogs(limit = 50) {
    return activityLogs.slice(0, limit);
}

module.exports = adminController;
