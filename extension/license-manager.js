/*
═══════════════════════════════════════════════════════════
  E.I.O - LICENSE MANAGER
  Sistema de Controle de Licenças e Período de Teste
  Email Suporte: msasdigital@gmail.com
═══════════════════════════════════════════════════════════
*/

const LICENSE_CONFIG = {
    TRIAL_DAYS: 5,
    API_URL: 'https://eio-system.vercel.app', // ✅ URL de Produção
    SUPPORT_EMAIL: 'msasdigital@gmail.com',
    COMPANY_NAME: 'MS Assessoria Digital',
    // Modo de produção - ATIVADO
    DEV_MODE: false, // ✅ Produção
    DEV_SKIP_LICENSE: false
};

class LicenseManager {
    constructor() {
        this.licenseData = null;
        this.isValid = false;
        this.userEmail = null;
    }

    /**
     * Inicializar verificação de licença
     */
    async initialize() {
        console.log('🔐 Inicializando License Manager...');

        // MODO DE DESENVOLVIMENTO - PULAR VERIFICAÇÃO
        if (LICENSE_CONFIG.DEV_MODE && LICENSE_CONFIG.DEV_SKIP_LICENSE) {
            console.warn('⚠️ MODO DE DESENVOLVIMENTO - Licença pulada');
            console.warn('⚠️ DESATIVAR EM PRODUÇÃO!');
            this.isValid = true;
            this.userEmail = 'dev@test.com';
            return true;
        }

        try {
            // Carregar dados salvos
            const stored = await this.getStoredLicense();

            if (!stored || !stored.userEmail) {
                // Primeira vez - solicitar login
                await this.requestLogin();
                return false;
            }

            this.userEmail = stored.userEmail;
            this.licenseData = stored;

            // Verificar validade da licença
            const isValid = await this.validateLicense();

            if (!isValid) {
                await this.handleExpiredLicense();
                return false;
            }

            this.isValid = true;
            return true;

        } catch (error) {
            console.error('Erro ao inicializar licença:', error);

            // Em modo dev, permitir continuar mesmo com erro
            if (LICENSE_CONFIG.DEV_MODE) {
                console.warn('⚠️ Erro ignorado em modo DEV');
                this.isValid = true;
                return true;
            }

            await this.showError('Erro ao verificar licença. Contate o suporte.');
            return false;
        }
    }

    /**
     * Solicitar login do usuário
     */
    async requestLogin() {
        return new Promise((resolve) => {
            const modal = this.createLoginModal();
            document.body.appendChild(modal);

            window.handleInstagramLogin = async (instagram_handle) => {
                try {
                    const response = await fetch(`${LICENSE_CONFIG.API_URL}/api/v1/auth/instagram-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instagram_handle })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        // Mensagem de erro personalizada baseada no código
                        let errorMessage = data.message || 'Erro ao fazer login';

                        if (data.code === 'INSTAGRAM_NOT_FOUND') {
                            errorMessage = '❌ Este @ não está cadastrado no sistema.\n\nCadastre-se no dashboard ou entre em contato com o suporte.';
                        } else if (data.code === 'LICENSE_EXPIRED') {
                            errorMessage = '⏰ Sua licença expirou!\n\nRenove sua assinatura para continuar usando.';
                        } else if (data.code === 'ACCOUNT_DISABLED') {
                            errorMessage = '🚫 Esta conta está desativada.\n\nEntre em contato com o suporte.';
                        }

                        alert(errorMessage);
                        return;
                    }

                    // Salvar licença
                    await this.saveLicense({
                        userEmail: data.user.email,
                        instagramHandle: instagram_handle,
                        token: data.token,
                        subscription: data.subscription,
                        trialStartDate: data.trialStartDate || new Date().toISOString(),
                        isPaid: data.isPaid || false,
                        userId: data.user.id
                    });

                    modal.remove();
                    this.isValid = true;
                    this.userEmail = data.user.email;
                    resolve(true);

                    if (typeof showToast === 'function') {
                        showToast(`✅ Login realizado! Bem-vindo @${instagram_handle}`, 'success');
                    }

                    // Recarregar a página para aplicar a licença
                    window.location.reload();

                } catch (error) {
                    console.error('Erro no login:', error);
                    alert('❌ Erro de conexão. Verifique sua internet e tente novamente.');
                }
            };
        });
    }

    /**
     * Validar licença com servidor
     */
    async validateLicense() {
        try {
            // Verificar período de teste
            const trialDaysRemaining = this.getTrialDaysRemaining();

            if (this.licenseData.isPaid) {
                // Licença paga - verificar com servidor
                const response = await fetch(`${LICENSE_CONFIG.API_URL}/api/v1/license/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.licenseData.token}`
                    },
                    body: JSON.stringify({ email: this.userEmail })
                });

                if (!response.ok) {
                    return false;
                }

                const data = await response.json();
                return data.isValid;

            } else {
                // Período de teste
                if (trialDaysRemaining > 0) {
                    this.showTrialWarning(trialDaysRemaining);
                    return true;
                } else {
                    return false;
                }
            }

        } catch (error) {
            console.error('Erro ao validar licença:', error);
            // Em caso de erro de rede, permitir uso offline por 24h
            return this.allowOfflineGracePeriod();
        }
    }

    /**
     * Calcular dias restantes do período de teste
     */
    getTrialDaysRemaining() {
        if (!this.licenseData || !this.licenseData.trialStartDate) {
            return 0;
        }

        const startDate = new Date(this.licenseData.trialStartDate);
        const now = new Date();
        const diffTime = now - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, LICENSE_CONFIG.TRIAL_DAYS - diffDays);
    }

    /**
     * Mostrar aviso de período de teste
     */
    showTrialWarning(daysRemaining) {
        if (daysRemaining <= 2) {
            const message = daysRemaining === 0
                ? '⚠️ Último dia de teste! Ative sua licença hoje.'
                : `⚠️ ${daysRemaining} dia(s) restante(s) de teste`;

            if (typeof showToast === 'function') {
                showToast(message, 'warning');
            }
        }
    }

    /**
     * Lidar com licença expirada
     */
    async handleExpiredLicense() {
        const modal = document.createElement('div');
        modal.className = 'eio-terms-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="eio-terms-content" style="max-width: 450px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🔒</div>
                <h2 style="color: #FF9800; margin-bottom: 16px;">Período de Teste Expirado</h2>
                <p style="color: rgba(255,255,255,0.8); margin-bottom: 24px; line-height: 1.6;">
                    Seu período de teste de <b>5 dias</b> expirou.<br>
                    Para continuar usando o <b>E.I.O System</b>, ative sua licença no dashboard.
                </p>
                <div style="background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <p style="font-size: 0.9rem; color: white; margin-bottom: 8px;">
                        📧 Email: <b>${this.userEmail}</b>
                    </p>
                    <p style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">
                        Suporte: ${LICENSE_CONFIG.SUPPORT_EMAIL}
                    </p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="eio-btn eio-btn-ghost" style="flex: 1;" id="closeExpiredBtn">Fechar</button>
                    <button class="eio-btn eio-btn-primary" style="flex: 2;" id="activateLicenseBtn">
                        💳 Ativar Licença
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Adicionar event listeners
        modal.querySelector('#closeExpiredBtn').addEventListener('click', () => window.close());
        modal.querySelector('#activateLicenseBtn').addEventListener('click', () => {
            window.open(`${LICENSE_CONFIG.API_URL}/dashboard?action=payment&email=${encodeURIComponent(this.userEmail)}`, '_blank');
        });

        // Desabilitar todas as funcionalidades
        this.disableExtension();
    }

    /**
     * Desabilitar extensão
     */
    disableExtension() {
        // Desabilitar todos os botões
        document.querySelectorAll('button').forEach(btn => {
            if (!btn.onclick || !btn.onclick.toString().includes('openDashboardPayment')) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });

        // Desabilitar inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.5';
        });

        // Mostrar overlay de bloqueio
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9998;
            pointer-events: all;
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Permitir período de graça offline (24h)
     */
    allowOfflineGracePeriod() {
        const lastCheck = this.licenseData.lastOnlineCheck || new Date().toISOString();
        const hoursSinceCheck = (new Date() - new Date(lastCheck)) / (1000 * 60 * 60);

        if (hoursSinceCheck < 24) {
            console.log('⚠️ Modo offline - período de graça ativo');
            return true;
        }

        return false;
    }

    /**
     * Criar modal de login
     */
    createLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'eio-terms-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="eio-terms-content" style="max-width: 400px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🚀</div>
                    <h2 style="color: white; margin-bottom: 8px;">Bem-vindo ao E.I.O</h2>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">
                        Faça login com o @ do seu Instagram
                    </p>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; color: rgba(255,255,255,0.6); font-size: 0.75rem; margin-bottom: 8px; text-transform: uppercase;">
                        @ DO INSTAGRAM CADASTRADO
                    </label>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #6246ea; font-weight: 600;">@</span>
                        <input type="text" id="loginInstagram" class="eio-input" placeholder="seu_instagram" style="width: 100%; padding-left: 30px;">
                    </div>
                    <p style="color: rgba(255,255,255,0.4); font-size: 0.75rem; margin-top: 8px;">
                        Use o mesmo @ cadastrado no seu dashboard
                    </p>
                </div>
                
                <button class="eio-btn eio-btn-primary" style="width: 100%; margin-bottom: 16px;" id="submitLoginBtn">
                    Entrar
                </button>
                
                <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <p style="font-size: 0.8rem; color: #FFC107; margin: 0; line-height: 1.4;">
                        ⚠️ <strong>Atenção:</strong> Você só poderá acessar se seu @ estiver cadastrado no dashboard do cliente. Limite de 2 perfis por conta.
                    </p>
                </div>
                
                <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
                        Não tem uma conta cadastrada?
                    </p>
                    <a href="${LICENSE_CONFIG.API_URL}/register.html" target="_blank" style="color: #42A5F5; text-decoration: none; font-weight: 600;">
                        Criar conta grátis (5 dias de teste)
                    </a>
                </div>
                
                <div style="margin-top: 16px; text-align: center;">
                    <p style="font-size: 0.75rem; color: rgba(255,255,255,0.4);">
                        Suporte: ${LICENSE_CONFIG.SUPPORT_EMAIL}
                    </p>
                </div>
            </div>
        `;

        window.submitLogin = () => {
            const instagramInput = document.getElementById('loginInstagram').value;
            const instagram_handle = instagramInput.replace('@', '').trim().toLowerCase();

            if (!instagram_handle) {
                alert('Por favor, digite seu @ do Instagram');
                return;
            }

            window.handleInstagramLogin(instagram_handle);
        };

        // Adicionar event listener ao botão
        modal.querySelector('#submitLoginBtn').addEventListener('click', window.submitLogin);

        // Enter key para submeter
        modal.querySelector('#loginInstagram').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.submitLogin();
        });

        return modal;
    }

    /**
     * Salvar licença no storage
     */
    async saveLicense(data) {
        this.licenseData = data;

        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({ licenseData: data });
        } else {
            localStorage.setItem('eio_license', JSON.stringify(data));
        }
    }

    /**
     * Obter licença salva
     */
    async getStoredLicense() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get(['licenseData']);
            return result.licenseData;
        } else {
            const stored = localStorage.getItem('eio_license');
            return stored ? JSON.parse(stored) : null;
        }
    }

    /**
     * Mostrar erro
     */
    async showError(message) {
        alert('❌ ' + message);
    }

    /**
     * Fazer logout
     */
    async logout() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.remove(['licenseData']);
        } else {
            localStorage.removeItem('eio_license');
        }

        this.licenseData = null;
        this.isValid = false;
        this.userEmail = null;

        window.location.reload();
    }
}

// Instância global
window.licenseManager = new LicenseManager();

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicenseManager;
}

console.log('✓ License Manager carregado');
