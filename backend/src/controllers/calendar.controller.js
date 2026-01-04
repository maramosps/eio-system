/*
═══════════════════════════════════════════════════════════
  E.I.O - CALENDAR CONTROLLER
  Controlador de calendário editorial
═══════════════════════════════════════════════════════════
*/

const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

// In-memory storage (replace with database model later)
let scheduledContent = [];
let contentIdCounter = 1;

/**
 * Get all scheduled content
 */
exports.getScheduledContent = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const userId = req.user.id;

        let content = scheduledContent.filter(c => c.user_id === userId);

        // Filter by month/year if provided
        if (month && year) {
            content = content.filter(c => {
                const date = new Date(c.scheduled_date);
                return date.getMonth() + 1 === parseInt(month) &&
                    date.getFullYear() === parseInt(year);
            });
        }

        res.json({
            success: true,
            data: { content }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create scheduled content
 */
exports.createScheduledContent = async (req, res, next) => {
    try {
        const { type, scheduled_date, caption, hashtags, status } = req.body;
        const userId = req.user.id;

        const content = {
            id: contentIdCounter++,
            user_id: userId,
            type,
            scheduled_date,
            caption,
            hashtags,
            status: status || 'draft',
            created_at: new Date(),
            updated_at: new Date()
        };

        scheduledContent.push(content);

        res.status(201).json({
            success: true,
            message: 'Conteúdo agendado com sucesso',
            data: { content }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update scheduled content
 */
exports.updateScheduledContent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type, scheduled_date, caption, hashtags, status } = req.body;
        const userId = req.user.id;

        const contentIndex = scheduledContent.findIndex(
            c => c.id === parseInt(id) && c.user_id === userId
        );

        if (contentIndex === -1) {
            throw new AppError('Conteúdo não encontrado', 404);
        }

        scheduledContent[contentIndex] = {
            ...scheduledContent[contentIndex],
            ...(type && { type }),
            ...(scheduled_date && { scheduled_date }),
            ...(caption && { caption }),
            ...(hashtags && { hashtags }),
            ...(status && { status }),
            updated_at: new Date()
        };

        res.json({
            success: true,
            message: 'Conteúdo atualizado com sucesso',
            data: { content: scheduledContent[contentIndex] }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete scheduled content
 */
exports.deleteScheduledContent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const contentIndex = scheduledContent.findIndex(
            c => c.id === parseInt(id) && c.user_id === userId
        );

        if (contentIndex === -1) {
            throw new AppError('Conteúdo não encontrado', 404);
        }

        scheduledContent.splice(contentIndex, 1);

        res.json({
            success: true,
            message: 'Conteúdo deletado com sucesso'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get content by date
 */
exports.getContentByDate = async (req, res, next) => {
    try {
        const { date } = req.params;
        const userId = req.user.id;

        const content = scheduledContent.filter(c =>
            c.user_id === userId &&
            c.scheduled_date.startsWith(date)
        );

        res.json({
            success: true,
            data: { content }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export calendar
 */
exports.exportCalendar = async (req, res, next) => {
    try {
        const { month, year, format = 'json' } = req.query;
        const userId = req.user.id;

        let content = scheduledContent.filter(c => c.user_id === userId);

        if (month && year) {
            content = content.filter(c => {
                const date = new Date(c.scheduled_date);
                return date.getMonth() + 1 === parseInt(month) &&
                    date.getFullYear() === parseInt(year);
            });
        }

        // TODO: Implement iCal/CSV export

        res.json({
            success: true,
            message: 'Calendário exportado com sucesso',
            data: { content, format }
        });
    } catch (error) {
        next(error);
    }
};
