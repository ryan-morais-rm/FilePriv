export function login() {
    const API_URL = 'http://localhost:3000/api/auth/login';
    const form = document.getElementById('loginForm');
    const msgArea = document.getElementById('messageArea'); // Área para erros
    const btn = document.querySelector('button[type="submit"]');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // IMPEDE o envio padrão do formulário (que causava o erro 405)

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            msgArea.innerHTML = `<div class="alert alert-danger mt-3">Preencha todos os campos!</div>`;
            return;
        }

        // Feedback visual
        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...`;
        msgArea.innerHTML = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST', // Aqui garantimos que é POST
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha no login');
            }

            // SUCESSO
            msgArea.innerHTML = `<div class="alert alert-success mt-3">Login realizado! Redirecionando...</div>`;
            
            // Salva dados no LocalStorage para usar nas outras páginas (Nome na Navbar, etc)
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            setTimeout(() => {
                window.location.href = "homepage.html";
            }, 1000);

        } catch (error) {
            console.error("Erro:", error);
            msgArea.innerHTML = `<div class="alert alert-danger mt-3">${error.message}</div>`;
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });
}