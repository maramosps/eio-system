// Login page functionality
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.eio-login-tab');
    const forms = document.querySelectorAll('.eio-login-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('eio-login-tab-active'));
            forms.forEach(f => f.classList.remove('eio-login-form-active'));

            tab.classList.add('eio-login-tab-active');
            document.getElementById(`${targetTab}Login${targetTab === 'email' ? 'Form' : ''}`).classList.add('eio-login-form-active');
        });
    });

    // Password Toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            if (type === 'text') {
                togglePassword.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                togglePassword.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        });
    }

    // Email/Instagram login
    const emailForm = document.getElementById('emailLoginForm');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const instagram_handle = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Admin Login Check
            if (instagram_handle === 'admin@eio.com' && password === 'admin123') {
                localStorage.setItem('accessToken', 'mock-admin-token');
                localStorage.setItem('user', JSON.stringify({
                    id: 'admin',
                    name: 'Admin User',
                    email: 'admin@eio.com',
                    role: 'admin'
                }));
                window.location.href = 'admin.html';
                return;
            }

            try {
                const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instagram_handle, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('accessToken', data.data.accessToken);
                    localStorage.setItem('user', JSON.stringify(data.data.user));

                    if (data.code === 'SUBSCRIPTION_PENDING') {
                        // Check if it's the specific trial expired message
                        alert('Seu teste expirou! Aproveite nossa PROMOÇÃO.');
                        // Or redirect to pending pay page
                        window.location.href = 'pending.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    alert(data.message || 'Erro ao fazer login');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Erro ao conectar ao servidor');
            }
        });
    }
});
