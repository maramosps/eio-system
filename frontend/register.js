document.addEventListener('DOMContentLoaded', () => {
    // Password Toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle Icon
            if (type === 'text') {
                togglePassword.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                togglePassword.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        });
    }

    // Form Submission
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const instagram_handle = document.getElementById('instagram_handle').value;
            const email = document.getElementById('email').value;
            const whatsapp = document.getElementById('whatsapp').value;
            const password = document.getElementById('password').value;

            // Basic validation
            if (!name || !instagram_handle || !email || !whatsapp || !password) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/v1/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, instagram_handle, email, whatsapp, password })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Cadastro realizado com sucesso! Aproveite seus 05 dias grátis.');
                    localStorage.setItem('accessToken', data.data.accessToken);
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.message || 'Erro ao realizar cadastro');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Erro ao conectar ao servidor. Tente novamente.');
            }
        });
    }
});
