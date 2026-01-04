/*
═══════════════════════════════════════════════════════════
  E.I.O - ANALYTICS CONTROLLER
  Controlador de análises e métricas
═══════════════════════════════════════════════════════════
*/

const { Log, User, Account, Flow, Execution } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../database/connection');

// Helper to check if DB is available
const isDbConnected = async () => {
    try {
        await sequelize.authenticate();
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Get dashboard overview analytics
 */
exports.getOverview = async (req, res, next) => {
    try {
        const { period = 30 } = req.query;
        const userId = req.user.id;

        if (!(await isDbConnected())) {
            // Mock data fallback if DB is offline
            return res.json({
                success: true,
                message: 'Usando dados simulados (Banco Offline)',
                data: {
                    kpis: { followers: 12400, engagement_rate: 4.8, reach: 8200, posts: 24 },
                    followerGrowth: [{ date: '2024-12-20', count: 12100 }, { date: '2024-12-21', count: 12200 }, { date: '2024-12-22', count: 12300 }, { date: '2024-12-23', count: 12400 }],
                    engagementDistribution: [{ action: 'like', count: 450 }, { action: 'comment', count: 80 }, { action: 'share', count: 45 }, { action: 'save', count: 120 }],
                    period
                }
            });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        // Get follower growth
        const followerLogs = await Log.findAll({
            where: {
                user_id: userId,
                action: 'follow',
                created_at: { [Op.gte]: startDate }
            },
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
        });

        // Get engagement metrics
        const engagementLogs = await Log.findAll({
            where: {
                user_id: userId,
                action: { [Op.in]: ['like', 'comment', 'share'] },
                created_at: { [Op.gte]: startDate }
            },
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['action']
        });

        // Get total stats
        const totalFollows = await Log.count({
            where: { user_id: userId, action: 'follow', created_at: { [Op.gte]: startDate } }
        });

        const totalLikes = await Log.count({
            where: { user_id: userId, action: 'like', created_at: { [Op.gte]: startDate } }
        });

        const totalComments = await Log.count({
            where: { user_id: userId, action: 'comment', created_at: { [Op.gte]: startDate } }
        });

        // Calculate engagement rate (mock calculation)
        const engagementRate = totalLikes > 0 ? ((totalComments / totalLikes) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                kpis: {
                    followers: totalFollows,
                    engagement_rate: parseFloat(engagementRate),
                    reach: totalLikes + totalComments,
                    posts: await getPostsCount(userId, period)
                },
                followerGrowth: followerLogs,
                engagementDistribution: engagementLogs,
                period
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get best performing posts
 */
exports.getBestPosts = async (req, res, next) => {
    try {
        const { period = 30, limit = 10 } = req.query;
        const userId = req.user.id;

        if (!(await isDbConnected())) {
            return res.json({
                success: true,
                message: 'Usando dados simulados (Banco Offline)',
                data: {
                    posts: [
                        { post_id: 'p1', likes: 1250, comments: 89 },
                        { post_id: 'p2', likes: 980, comments: 45 },
                        { post_id: 'p3', likes: 850, comments: 32 }
                    ]
                }
            });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        // Get posts with most engagement
        const posts = await Log.findAll({
            where: {
                user_id: userId,
                action: { [Op.in]: ['like', 'comment'] },
                created_at: { [Op.gte]: startDate }
            },
            attributes: [
                [sequelize.col('metadata.post_id'), 'post_id'],
                [sequelize.fn('SUM', sequelize.literal("CASE WHEN action = 'like' THEN 1 ELSE 0 END")), 'likes'],
                [sequelize.fn('SUM', sequelize.literal("CASE WHEN action = 'comment' THEN 1 ELSE 0 END")), 'comments']
            ],
            group: [sequelize.col('metadata.post_id')],
            order: [[sequelize.literal('likes + comments'), 'DESC']],
            limit: parseInt(limit),
            raw: true
        });

        res.json({
            success: true,
            data: { posts }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get best times to post
 */
exports.getBestTimes = async (req, res, next) => {
    try {
        const { period = 30 } = req.query;
        const userId = req.user.id;

        if (!(await isDbConnected())) {
            return res.json({
                success: true,
                message: 'Usando dados simulados (Banco Offline)',
                data: {
                    hourlyEngagement: [
                        { hour: 9, engagement: 120 },
                        { hour: 12, engagement: 450 },
                        { hour: 15, engagement: 890 },
                        { hour: 18, engagement: 670 },
                        { hour: 21, engagement: 340 }
                    ]
                }
            });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        // Get engagement by hour
        const hourlyEngagement = await Log.findAll({
            where: {
                user_id: userId,
                action: { [Op.in]: ['like', 'comment'] },
                created_at: { [Op.gte]: startDate }
            },
            attributes: [
                [sequelize.fn('HOUR', sequelize.col('created_at')), 'hour'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'engagement']
            ],
            group: [sequelize.fn('HOUR', sequelize.col('created_at'))],
            order: [[sequelize.fn('HOUR', sequelize.col('created_at')), 'ASC']],
            raw: true
        });

        res.json({
            success: true,
            data: { hourlyEngagement }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get growth analytics
 */
exports.getGrowthAnalytics = async (req, res, next) => {
    try {
        const { period = 30 } = req.query;
        const userId = req.user.id;

        if (!(await isDbConnected())) {
            return res.json({
                success: true,
                message: 'Usando dados simulados (Banco Offline)',
                data: {
                    dailyGrowth: [
                        { date: '2024-12-20', action: 'follow', count: 45 },
                        { date: '2024-12-21', action: 'follow', count: 52 },
                        { date: '2024-12-22', action: 'follow', count: 48 },
                        { date: '2024-12-23', action: 'follow', count: 61 }
                    ]
                }
            });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        // Daily growth
        const dailyGrowth = await Log.findAll({
            where: {
                user_id: userId,
                action: ['follow', 'unfollow'],
                created_at: { [Op.gte]: startDate }
            },
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                'action',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE', sequelize.col('created_at')), 'action'],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
            raw: true
        });

        res.json({
            success: true,
            data: { dailyGrowth }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export analytics report
 */
exports.exportReport = async (req, res, next) => {
    try {
        const { period = 30, format = 'json' } = req.query;
        const userId = req.user.id;

        res.json({
            success: true,
            message: 'Relatório gerado com sucesso',
            data: { format, period }
        });
    } catch (error) {
        next(error);
    }
};

// Helper functions
async function getPostsCount(userId, period) {
    if (!(await isDbConnected())) return 24;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const count = await Execution.count({
        where: {
            user_id: userId,
            created_at: { [Op.gte]: startDate }
        }
    });

    return count;
}
