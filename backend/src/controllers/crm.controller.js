/*
═══════════════════════════════════════════════════════════
  E.I.O - CRM CONTROLLER
  Controlador de CRM para gerenciamento de leads
═══════════════════════════════════════════════════════════
*/

const { AppError } = require('../middlewares/errorHandler');

// In-memory storage (replace with database model later)
let leads = [];
let leadIdCounter = 1;
let interactions = [];
let interactionIdCounter = 1;

/**
 * Get all leads
 */
exports.getLeads = async (req, res, next) => {
    try {
        const { status, search } = req.query;
        const userId = req.user.id;

        let userLeads = leads.filter(l => l.user_id === userId);

        // Filter by status
        if (status && status !== 'all') {
            userLeads = userLeads.filter(l => l.status === status);
        }

        // Search by name or username
        if (search) {
            const searchLower = search.toLowerCase();
            userLeads = userLeads.filter(l =>
                l.name.toLowerCase().includes(searchLower) ||
                l.username.toLowerCase().includes(searchLower)
            );
        }

        res.json({
            success: true,
            data: { leads: userLeads }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new lead
 */
exports.createLead = async (req, res, next) => {
    try {
        const { name, username, tags, notes, status } = req.body;
        const userId = req.user.id;

        const lead = {
            id: leadIdCounter++,
            user_id: userId,
            name,
            username,
            tags: tags || [],
            notes: notes || '',
            status: status || 'new',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            created_at: new Date(),
            updated_at: new Date()
        };

        leads.push(lead);

        // Create interaction log
        await addInteraction(lead.id, userId, 'Lead criado no sistema');

        res.status(201).json({
            success: true,
            message: 'Lead criado com sucesso',
            data: { lead }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get lead by ID
 */
exports.getLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const lead = leads.find(l => l.id === parseInt(id) && l.user_id === userId);

        if (!lead) {
            throw new AppError('Lead não encontrado', 404);
        }

        // Get lead interactions
        const leadInteractions = interactions.filter(i => i.lead_id === lead.id);

        res.json({
            success: true,
            data: {
                lead,
                interactions: leadInteractions
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update lead
 */
exports.updateLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, username, tags, notes, status, followup_date } = req.body;
        const userId = req.user.id;

        const leadIndex = leads.findIndex(l => l.id === parseInt(id) && l.user_id === userId);

        if (leadIndex === -1) {
            throw new AppError('Lead não encontrado', 404);
        }

        const oldStatus = leads[leadIndex].status;

        leads[leadIndex] = {
            ...leads[leadIndex],
            ...(name && { name }),
            ...(username && { username }),
            ...(tags && { tags }),
            ...(notes && { notes }),
            ...(status && { status }),
            ...(followup_date && { followup_date }),
            updated_at: new Date()
        };

        // Log status change
        if (status && status !== oldStatus) {
            await addInteraction(
                leads[leadIndex].id,
                userId,
                `Status alterado de "${oldStatus}" para "${status}"`
            );
        }

        res.json({
            success: true,
            message: 'Lead atualizado com sucesso',
            data: { lead: leads[leadIndex] }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete lead
 */
exports.deleteLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const leadIndex = leads.findIndex(l => l.id === parseInt(id) && l.user_id === userId);

        if (leadIndex === -1) {
            throw new AppError('Lead não encontrado', 404);
        }

        leads.splice(leadIndex, 1);

        // Delete all interactions
        interactions = interactions.filter(i => i.lead_id !== parseInt(id));

        res.json({
            success: true,
            message: 'Lead deletado com sucesso'
        });
    } catch (error) {
        next(error);
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

        const lead = leads.find(l => l.id === parseInt(id) && l.user_id === userId);

        if (!lead) {
            throw new AppError('Lead não encontrado', 404);
        }

        const interaction = await addInteraction(lead.id, userId, description);

        res.status(201).json({
            success: true,
            message: 'Interação adicionada com sucesso',
            data: { interaction }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get CRM stats
 */
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const userLeads = leads.filter(l => l.user_id === userId);

        const stats = {
            total: userLeads.length,
            new: userLeads.filter(l => l.status === 'new').length,
            contacted: userLeads.filter(l => l.status === 'contacted').length,
            qualified: userLeads.filter(l => l.status === 'qualified').length,
            converted: userLeads.filter(l => l.status === 'converted').length,
            this_month: userLeads.filter(l => {
                const created = new Date(l.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() &&
                    created.getFullYear() === now.getFullYear();
            }).length
        };

        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        next(error);
    }
};

// Helper function
async function addInteraction(leadId, userId, description) {
    const interaction = {
        id: interactionIdCounter++,
        lead_id: leadId,
        user_id: userId,
        description,
        created_at: new Date()
    };

    interactions.push(interaction);
    return interaction;
}
