// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - API CLIENT
// Cliente HTTP para comunicação com backend
// ═══════════════════════════════════════════════════════════

// Usar configuração centralizada
const API_BASE_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

class API {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('accessToken');
    }

    // Helper method for requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                // Se o erro for falta de assinatura, redireciona para página de pagamento
                if (data.code === 'SUBSCRIPTION_PENDING' && !window.location.href.includes('pending.html')) {
                    window.location.href = 'pending.html';
                }
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // AUTH
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.data.accessToken) {
            this.setToken(data.data.accessToken);
        }

        return data;
    }

    async register(email, password, name) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('accessToken', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('accessToken');
    }

    // ANALYTICS
    async getAnalyticsOverview(period = 30) {
        return this.request(`/analytics/overview?period=${period}`);
    }

    async getBestPosts(period = 30) {
        return this.request(`/analytics/best-posts?period=${period}`);
    }

    async getBestTimes(period = 30) {
        return this.request(`/analytics/best-times?period=${period}`);
    }

    async getGrowthAnalytics(period = 30) {
        return this.request(`/analytics/growth?period=${period}`);
    }

    async exportAnalytics(period, format = 'json') {
        return this.request(`/analytics/export?period=${period}&format=${format}`);
    }

    // CALENDAR
    async getScheduledContent(month, year) {
        let endpoint = '/calendar';
        if (month && year) {
            endpoint += `?month=${month}&year=${year}`;
        }
        return this.request(endpoint);
    }

    async createScheduledContent(contentData) {
        return this.request('/calendar', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async updateScheduledContent(id, contentData) {
        return this.request(`/calendar/${id}`, {
            method: 'PUT',
            body: JSON.stringify(contentData)
        });
    }

    async deleteScheduledContent(id) {
        return this.request(`/calendar/${id}`, {
            method: 'DELETE'
        });
    }

    async getContentByDate(date) {
        return this.request(`/calendar/${date}/content`);
    }

    async exportCalendar(month, year, format = 'json') {
        return this.request(`/calendar/export?month=${month}&year=${year}&format=${format}`);
    }

    // CRM
    async getLeads(status = null, search = null) {
        let endpoint = '/crm';
        const params = [];
        if (status) params.push(`status=${status}`);
        if (search) params.push(`search=${search}`);
        if (params.length) endpoint += `?${params.join('&')}`;

        return this.request(endpoint);
    }

    async createLead(leadData) {
        return this.request('/crm', {
            method: 'POST',
            body: JSON.stringify(leadData)
        });
    }

    async getLead(id) {
        return this.request(`/crm/${id}`);
    }

    async updateLead(id, leadData) {
        return this.request(`/crm/${id}`, {
            method: 'PUT',
            body: JSON.stringify(leadData)
        });
    }

    async deleteLead(id) {
        return this.request(`/crm/${id}`, {
            method: 'DELETE'
        });
    }

    async addLeadInteraction(id, description) {
        return this.request(`/crm/${id}/interactions`, {
            method: 'POST',
            body: JSON.stringify({ description })
        });
    }

    async getCRMStats() {
        return this.request('/crm/stats');
    }

    // FLOWS
    async getFlows() {
        return this.request('/flows');
    }

    async createFlow(flowData) {
        return this.request('/flows', {
            method: 'POST',
            body: JSON.stringify(flowData)
        });
    }

    async startFlow(id) {
        return this.request(`/flows/${id}/start`, {
            method: 'POST'
        });
    }

    // USER
    async getProfile() {
        return this.request('/users/me');
    }

    async updateProfile(userData) {
        return this.request('/users/me', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
}

// Export singleton instance
const api = new API();
window.api = api; // Make available globally
