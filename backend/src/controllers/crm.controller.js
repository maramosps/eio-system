/*
═══════════════════════════════════════════════════════════
  E.I.O - CRM CONTROLLER
  Controlador de CRM para gerenciamento de leads usando Sequelize
  (Substituído armazenamento em memória por banco de dados)
═══════════════════════════════════════════════════════════
*/

const { Lead, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all leads for the logged user
 */
exports.getLeads = async (req, res, next) => {
    try {
        const { status, search } = req.query;
        const userId = req.user.id;
        const role = req.user.role;

        // Se for admin, pode opcionalmente ver todos os leads ou apenas os dele
        // Por padrão, mostra apenas os dele a menos que especificado
        let where = {};
        if (role !== 'admin') {
            where.user_id = userId;
        }

        // Filter by status
        if (status && status !== 'all') {
            where.status = status;
        }

        // Search by name or username
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { username: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const leads = await Lead.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: { leads }
        });
    } catch (error) {
        console.error('CRM getLeads error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar leads' });
    }
};

/**
 * Create new lead
 */
exports.createLead = async (req, res, next) => {
    try {
        const { name, username, tags, notes, status, avatar } = req.body;
        const userId = req.user.id;

        const lead = await Lead.create({
            user_id: userId,
            name,
            username,
            tags: tags || [],
            notes: notes || '',
            status: status || 'new',
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            timeline: [{ date: new Date(), action: 'Lead criado no sistema' }]
        });

        res.status(201).json({
            success: true,
            message: 'Lead criado com sucesso',
            data: { lead }
        });
    } catch (error) {
        console.error('CRM createLead error:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar lead' });
    }
};

/**
 * Get lead by ID
 */
exports.getLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const lead = await Lead.findByPk(id);

        if (!lead || (lead.user_id !== userId && role !== 'admin')) {
            return res.status(404).json({ success: false, message: 'Lead não encontrado' });
        }

        res.json({
            success: true,
            data: {
                lead,
                interactions: lead.timeline || []
            }
        });
    } catch (error) {
        console.error('CRM getLead error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar lead' });
    }
};

/**
 * Update lead
 */
exports.updateLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, username, tags, notes, status, avatar } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        const lead = await Lead.findByPk(id);

        if (!lead || (lead.user_id !== userId && role !== 'admin')) {
            return res.status(404).json({ success: false, message: 'Lead não encontrado' });
        }

        const oldStatus = lead.status;
        const updates = {
            name: name || lead.name,
            username: username || lead.username,
            tags: tags || lead.tags,
            notes: notes || lead.notes,
            status: status || lead.status,
            avatar: avatar || lead.avatar
        };

        if (status && status !== oldStatus) {
            const timeline = lead.timeline || [];
            timeline.push({
                date: new Date(),
                action: `Status alterado de "${oldStatus}" para "${status}"`
            });
            updates.timeline = timeline;
        }

        await lead.update(updates);

        res.json({
            success: true,
            message: 'Lead atualizado com sucesso',
            data: { lead }
        });
    } catch (error) {
        console.error('CRM updateLead error:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar lead' });
    }
};

/**
 * Delete lead
 */
exports.deleteLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const lead = await Lead.findByPk(id);

        if (!lead || (lead.user_id !== userId && role !== 'admin')) {
            return res.status(404).json({ success: false, message: 'Lead não encontrado' });
        }

        await lead.destroy();

        res.json({
            success: true,
            message: 'Lead deletado com sucesso'
        });
    } catch (error) {
        console.error('CRM deleteLead error:', error);
        res.status(500).json({ success: false, message: 'Erro ao deletar lead' });
    }
};

/**
 * Add interaction to lead
 */
exports.addInteraction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { description } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        const lead = await Lead.findByPk(id);

        if (!lead || (lead.user_id !== userId && role !== 'admin')) {
            return res.status(404).json({ success: false, message: 'Lead não encontrado' });
        }

        const timeline = lead.timeline || [];
        timeline.push({
            date: new Date(),
            action: description
        });

        await lead.update({ timeline });

        res.status(201).json({
            success: true,
            message: 'Interação adicionada com sucesso',
            data: { timeline }
        });
    } catch (error) {
        console.error('CRM addInteraction error:', error);
        res.status(500).json({ success: false, message: 'Erro ao adicionar interação' });
    }
};

/**
 * Get CRM stats
 */
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let where = {};
        if (role !== 'admin') {
            where.user_id = userId;
        }

        const total = await Lead.count({ where });
        const newLeads = await Lead.count({ where: { ...where, status: 'new' } });
        const contacted = await Lead.count({ where: { ...where, status: 'contacted' } });
        const qualified = await Lead.count({ where: { ...where, status: 'qualified' } });
        const converted = await Lead.count({ where: { ...where, status: 'converted' } });

        res.json({
            success: true,
            data: {
                stats: {
                    total,
                    new: newLeads,
                    contacted,
                    qualified,
                    converted
                }
            }
        });
    } catch (error) {
        console.error('CRM getStats error:', error);
        res.status(500).json({ success: false, message: 'Erro ao obter estatísticas' });
    }
};
