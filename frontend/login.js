// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - LOGIN PAGE CONTROLLER
// Gerencia autenticação do usuário
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Limpar restos de sessões anteriores ao carregar a página de login por segurança
    // Se o usuário clicar em "Entrar" na landing e cair aqui, ele DEVE ver o form
    console.log('🎯 Login Controller Ready');

    // Tabs
    const tabs = document.querySelectorAll('.eio-tab-btn');
    const emailForm = document.querySelector('.eio-login-form[data-form="email"]');
    const instagramForm = document.querySelector('.eio-login-form[data-form="instagram"]');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('eio-tab-active'));
            tab.classList.add('eio-tab-active');

            if (tab.dataset.tab === 'instagram') {
                emailForm?.classList.add('eio-hidden');
                instagramForm?.classList.remove('eio-hidden');
            } else {
                emailForm?.classList.remove('eio-hidden');
                instagramForm?.classList.add('eio-hidden');
            }
        });
    });

    // Email/Handle Login Form
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const instagram_handle = document.getElementById('instagram_handle').value.trim();
            const password = document.getElementById('password').value;

            const submitBtn = emailForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span> Entrando...';

            try {
                const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

                // Determine if input is email or handle
                const isEmail = instagram_handle.includes('@');

                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: isEmail ? instagram_handle : undefined,
                        instagram_handle: !isEmail ? instagram_handle : undefined,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    const user = data.user || data.data?.user;
                    const token = data.token || data.data?.accessToken;

                    // Save to localStorage
                    localStorage.setItem('accessToken', token);
                    localStorage.setItem('user', JSON.stringify(user));

                    console.log('✅ Login successful:', user);

                    // Redirect - Both admin and regular users go to dashboard
                    // Admin features will be shown automatically via admin-integration.js
                    window.location.href = 'dashboard.html';
                } else {
                    throw new Error(data.message || 'Erro ao fazer login');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Erro: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Instagram Form
    if (instagramForm) {
        instagramForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('insta_username')?.value;
            const password = document.getElementById('insta_password')?.value;

            if (!username || !password) {
                alert('Por favor, preencha todos os campos');
                return;
            }

            const submitBtn = instagramForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span> Conectando...';

            try {
                const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instagram_handle: username.startsWith('@') ? username : '@' + username,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    const user = data.user || data.data?.user;
                    const token = data.token || data.data?.accessToken;

                    localStorage.setItem('accessToken', token);
                    localStorage.setItem('user', JSON.stringify(user));

                    window.location.href = 'dashboard.html';
                } else {
                    throw new Error(data.message || 'Credenciais inválidas');
                }
            } catch (error) {
                console.error('Instagram login error:', error);
                alert('Erro: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Password visibility toggle
    const togglePassword = document.querySelector('.eio-toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
            }
        });
    }
});
