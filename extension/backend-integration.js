/*
═══════════════════════════════════════════════════════════
  E.I.O - BACKEND INTEGRATION MODULE
  Sincroniza leads e ações com o Dashboard/CRM/Analytics
═══════════════════════════════════════════════════════════
*/

const EIO_BACKEND = {
    API_URL: 'https://eio-system.vercel.app/api/v1',

    /**
     * Obter token de autenticação do storage
     */
    async getToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['eioLicenseData', 'eioUserData'], (result) => {
                const token = result.eioLicenseData?.token || result.eioUserData?.token || null;
                resolve(token);
            });
        });
    },

    /**
     * Obter dados do usuário
     */
    async getUserData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['eioUserData'], (result) => {
                resolve(result.eioUserData || null);
            });
        });
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * ENVIAR LEADS PARA O CRM/DASHBOARD
     * Chamado quando leads são carregados na extensão
     * ═══════════════════════════════════════════════════════════
     */
    async syncLeads(leads, source = 'extension') {
        const token = await this.getToken();
        if (!token) {
            console.log('[E.I.O Sync] Sem token, leads não serão sincronizados');
            return { success: false, error: 'no_token' };
        }

        try {
            // Formatar leads para o backend
            const formattedLeads = leads.map(lead => ({
                instagram_username: (lead.username || '').replace('@', ''),
                full_name: lead.fullName || lead.full_name || '',
                profile_pic: lead.avatar || lead.profilePic || lead.profile_pic_url || '',
                followers: lead.followers || 0,
                following: lead.following || 0,
                posts: lead.posts || 0,
                bio: lead.bio || '',
                is_private: lead.isPrivate || lead.is_private || false,
                is_verified: lead.isVerified || lead.is_verified || false,
                source: source,
                status: 'new'
            }));

            const response = await fetch(`${this.API_URL}/leads/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ leads: formattedLeads })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[E.I.O Sync] ✅ ${formattedLeads.length} leads sincronizados com o dashboard`);
                return { success: true, synced: formattedLeads.length, data };
            } else {
                const error = await response.text();
                console.log(`[E.I.O Sync] ⚠️ Erro ao sincronizar leads: ${response.status}`);
                return { success: false, error };
            }
        } catch (error) {
            console.error('[E.I.O Sync] Erro de conexão:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * REGISTRAR AÇÃO NO ANALYTICS
     * Chamado quando uma ação é executada (follow, like, etc)
     * ═══════════════════════════════════════════════════════════
     */
    async logAction(action, target, result = 'success', metadata = {}) {
        const token = await this.getToken();
        if (!token) {
            console.log('[E.I.O Analytics] Sem token, ação não será registrada');
            return { success: false };
        }

        try {
            const response = await fetch(`${this.API_URL}/analytics/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: action,
                    target: target,
                    result: result,
                    timestamp: new Date().toISOString(),
                    metadata: metadata
                })
            });

            if (response.ok) {
                console.log(`[E.I.O Analytics] ✅ Ação registrada: ${action} -> @${target}`);
                return { success: true };
            }
        } catch (error) {
            console.error('[E.I.O Analytics] Erro ao registrar ação:', error);
        }
        return { success: false };
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * ATUALIZAR STATUS DE UM LEAD
     * ═══════════════════════════════════════════════════════════
     */
    async updateLeadStatus(username, status, action = null) {
        const token = await this.getToken();
        if (!token) return { success: false };

        try {
            const response = await fetch(`${this.API_URL}/crm/update-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    instagram_username: username.replace('@', ''),
                    status: status,
                    last_action: action,
                    updated_at: new Date().toISOString()
                })
            });

            return { success: response.ok };
        } catch (error) {
            console.error('[E.I.O CRM] Erro ao atualizar status:', error);
            return { success: false };
        }
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * BUSCAR ESTATÍSTICAS DO DASHBOARD
     * ═══════════════════════════════════════════════════════════
     */
    async getStats() {
        const token = await this.getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${this.API_URL}/analytics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                return data.stats || null;
            }
        } catch (error) {
            console.error('[E.I.O] Erro ao buscar stats:', error);
        }
        return null;
    }
};

// Expor globalmente
window.EIO_BACKEND = EIO_BACKEND;
console.log('[E.I.O] Backend integration module loaded');
