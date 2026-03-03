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
     * Verifica múltiplas fontes: eio_token (login popup), eioLicenseData, eioUserData
     */
    async getToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['eio_token', 'eioLicenseData', 'eioUserData'], (result) => {
                // Priority: eio_token (set by popup login) > eioLicenseData > eioUserData
                const token = result.eio_token
                    || result.eioLicenseData?.token
                    || result.eioUserData?.token
                    || null;
                if (!token) {
                    console.warn('[E.I.O Backend] ⚠️ Nenhum token encontrado no storage. Chaves verificadas: eio_token, eioLicenseData, eioUserData');
                }
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
            console.error('[E.I.O Analytics] ❌ Sem token — ação NÃO será registrada. Verifique login.');
            return { success: false, error: 'no_token' };
        }

        const timestamp = new Date().toISOString();
        const payload1 = {
            action_type: action,
            target_username: target,
            success: result === 'success',
            timestamp: timestamp,
            source: 'extension'
        };
        const payload2 = {
            action: action,
            result: { username: target, status: result, ...metadata },
            timestamp: timestamp
        };

        // 1. Gravar no sistema Zero-Risk (action_logs)
        try {
            const res1 = await fetch(`${this.API_URL}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload1)
            });
            if (!res1.ok) {
                const errBody = await res1.text().catch(() => '(sem corpo)');
                console.error('ERRO API DASHBOARD [/actions]:', res1.status, errBody);
            } else {
                console.log(`[E.I.O Analytics] ✅ /actions OK: ${action} -> @${target}`);
            }
        } catch (err1) {
            console.error('ERRO API DASHBOARD [/actions] CATCH:', err1.message);
        }

        // 2. Gravar na tabela 'logs' legada (Dashboard lê daqui)
        try {
            const res2 = await fetch(`${this.API_URL}/executions/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload2)
            });
            if (!res2.ok) {
                const errBody = await res2.text().catch(() => '(sem corpo)');
                console.error('ERRO API DASHBOARD [/executions/log]:', res2.status, errBody);
                return { success: false, status: res2.status, error: errBody };
            }
            console.log(`[E.I.O Analytics] ✅ /executions/log OK: ${action} -> @${target}`);
            return { success: true };
        } catch (err2) {
            console.error('ERRO API DASHBOARD [/executions/log] CATCH:', err2.message);
            return { success: false, error: err2.message };
        }
    },

    /**
     * ═══════════════════════════════════════════════════════════
     * ATUALIZAR STATUS DE UM LEAD
     * ═══════════════════════════════════════════════════════════
     */
    async updateLeadStatus(username, status, action = null) {
        const token = await this.getToken();
        if (!token) {
            console.error('[E.I.O CRM] ❌ Sem token — updateLeadStatus abortado');
            return { success: false, error: 'no_token' };
        }

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

            if (!response.ok) {
                const errBody = await response.text().catch(() => '(sem corpo)');
                console.error('ERRO API DASHBOARD [/crm/update-status]:', response.status, errBody);
                return { success: false, status: response.status, error: errBody };
            }

            console.log(`[E.I.O CRM] ✅ Status atualizado para @${username}: ${status}`);
            return { success: true };
        } catch (error) {
            console.error('ERRO API DASHBOARD [/crm/update-status] CATCH:', error.message);
            return { success: false, error: error.message };
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
