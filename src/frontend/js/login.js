export function login() {
    const API_URL = 'http://localhost:3000/usuarios/login';
    const form = document.getElementById('loginForm');
    const msgArea = document.getElementById('messageArea'); 
    const btn = document.querySelector('button[type="submit"]');

    if (!form || !msgArea) {
        console.warn("Faltando elementos no HTML (form ou messageArea)");
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault(); 

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value.trim();

        if (!email || !senha) {
            msgArea.innerHTML = `<div class="alert alert-danger mt-3">Preencha todos os campos!</div>`;
            return;
        }

        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...`;
        msgArea.innerHTML = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    senha  
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Falha no login');
            }

            msgArea.innerHTML = `<div class="alert alert-success mt-3">Login realizado! Redirecionando...</div>`;
            
            localStorage.setItem('userData', JSON.stringify(data));

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