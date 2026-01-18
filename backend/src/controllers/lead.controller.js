const { Lead } = require('../models');

/**
 * Controller para gerenciamento de leads do CRM
 */
const leadController = {
    /**
     * Listar todos os leads do usuário
     */
    async list(req, res) {
        try {
            const userId = req.user.id;
            const leads = await Lead.findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']]
            });

            res.json({
                success: true,
                leads
            });
        } catch (error) {
            console.error('Erro ao listar leads:', error);
            res.status(500).json({ success: false, message: 'Erro ao carregar leads' });
        }
    },

    /**
     * Criar ou atualizar leads em lote (vindo da extensão)
     */
    async batchUpsert(req, res) {
        try {
            const userId = req.user.id;
            const { leads } = req.body;

            if (!leads || !Array.isArray(leads)) {
                return res.status(400).json({ success: false, message: 'Dados inválidos' });
            }

            const results = [];
            for (const leadData of leads) {
                // Suportar tanto o formato antigo quanto o novo
                const username = leadData.instagram_username || leadData.username || '';
                const avatar = leadData.profile_pic || leadData.avatar || leadData.profilePic || '';
                const name = leadData.full_name || leadData.fullName || leadData.name || username;

                const [lead, created] = await Lead.findOrCreate({
                    where: {
                        user_id: userId,
                        username: username.replace('@', '')
                    },
                    defaults: {
                        user_id: userId,
                        name: name,
                        username: username.replace('@', ''),
                        avatar: avatar,
                        status: leadData.status || 'new',
                        source: leadData.source || 'extension',
                        followers: leadData.followers || 0,
                        following: leadData.following || 0,
                        posts: leadData.posts || 0,
                        bio: leadData.bio || '',
                        is_private: leadData.is_private || false,
                        is_verified: leadData.is_verified || false,
                        timeline: [{
                            content: 'Lead capturado pela extensão E.I.O',
                            date: new Date().toISOString(),
                            source: leadData.source || 'extension'
                        }]
                    }
                });

                if (!created) {
                    // Se já existir, atualizar dados que mudaram
                    const updates = {};
                    if (avatar && lead.avatar !== avatar) updates.avatar = avatar;
                    if (name && lead.name !== name) updates.name = name;

                    if (Object.keys(updates).length > 0) {
                        await lead.update(updates);
                    }
                }
                results.push(lead);
            }

            res.json({
                success: true,
                message: `${results.length} leads processados com sucesso`,
                count: results.length
            });
        } catch (error) {
            console.error('Erro ao processar leads em lote:', error);
            res.status(500).json({ success: false, message: 'Erro ao salvar leads' });
        }
    },

    /**
     * Atualizar um lead específico
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            const lead = await Lead.findOne({ where: { id, user_id: userId } });
            if (!lead) {
                return res.status(404).json({ success: false, message: 'Lead não encontrado' });
            }

            await lead.update(updateData);

            res.json({
                success: true,
                lead
            });
        } catch (error) {
            console.error('Erro ao atualizar lead:', error);
            res.status(500).json({ success: false, message: 'Erro ao atualizar lead' });
        }
    }
};

module.exports = leadController;
