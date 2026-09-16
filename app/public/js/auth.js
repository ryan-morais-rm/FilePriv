function mostrarPainel(alvo) {
    const track = document.getElementById('authTrack');
    const brandCadastro = document.getElementById('brandCadastro');
    const brandLogin = document.getElementById('brandLogin');
    const btnCadastro = document.getElementById('btnShowCadastro');
    const btnLogin = document.getElementById('btnShowLogin');

    if (!track || !brandCadastro || !brandLogin || !btnCadastro || !btnLogin) {
        console.error('[auth] Elemento(s) do carrossel não encontrado(s) no DOM — confira se o auth.html está completo.');
        return;
    }

    const ehLogin = alvo === 'login';

    // O track tem 200% de largura com os dois cartões lado a lado — mover
    // -50% desloca exatamente uma "tela" (cadastro sai pela esquerda,
    // login entra pela direita; e o inverso ao voltar).
    track.classList.toggle('show-login', ehLogin);

    brandCadastro.classList.toggle('active', !ehLogin);
    brandLogin.classList.toggle('active', ehLogin);

    btnCadastro.classList.toggle('active', !ehLogin);
    btnLogin.classList.toggle('active', ehLogin);
}

function configurarAlternancia() {
    const btnCadastro = document.getElementById('btnShowCadastro');
    const btnLogin = document.getElementById('btnShowLogin');

    if (!btnCadastro || !btnLogin) {
        console.error('[auth] Botões de alternância (btnShowCadastro/btnShowLogin) não encontrados.');
    }

    btnCadastro?.addEventListener('click', () => mostrarPainel('cadastro'));
    btnLogin?.addEventListener('click', () => mostrarPainel('login'));

    document.querySelectorAll('[data-auth-switch]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPainel(el.dataset.authSwitch);
        });
    });
}

function configurarLogin() {
    const API_URL = '/usuarios/login';
    const form = document.getElementById('loginForm');
    const msgArea = document.getElementById('loginMessageArea');
    const btn = form?.querySelector('button[type="submit"]');

    if (!form || !msgArea) {
        console.error('[auth] loginForm ou loginMessageArea não encontrados.');
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
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Falha no login');
            }

            msgArea.innerHTML = `<div class="alert alert-success mt-3">Login realizado! Redirecionando...</div>`;

            localStorage.setItem('userData', JSON.stringify(data.usuario));
            localStorage.setItem('token', data.token);

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

function configurarCadastro() {
    const form = document.getElementById('registerForm');
    const msgArea = document.getElementById('registerMessageArea');

    if (!form || !msgArea) {
        console.error('[auth] registerForm ou registerMessageArea não encontrados.');
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const user = document.getElementById('username').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const senha = document.getElementById('password').value.trim();
        const confirmPass = document.getElementById('confirmPassword').value.trim();

        if (!user || !email || !senha || !confirmPass) {
            msgArea.innerHTML = `<div class="alert alert-danger">Preencha todos os campos!</div>`;
            return;
        }

        if (senha !== confirmPass) {
            msgArea.innerHTML = `<div class="alert alert-danger">As senhas digitadas não coincidem!</div>`;
            return;
        }

        if (senha.length < 6) {
            msgArea.innerHTML = `<div class="alert alert-danger">A senha deve ter no mínimo 6 caracteres.</div>`;
            return;
        }

        try {
            msgArea.innerHTML = `<div class="alert alert-info">Cadastrando...</div>`;

            const response = await fetch('/usuarios/cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: user, email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                msgArea.innerHTML = `
                    <div class="alert alert-success">
                        Bem-vindo(a), <strong>${data.nome}</strong>!<br>
                        Cadastro realizado. Faça login para continuar.
                    </div>`;

                form.reset();
                setTimeout(() => mostrarPainel('login'), 1500);
            } else {
                const errorMsg = data.error || 'Erro ao realizar cadastro.';
                msgArea.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
            }

        } catch (error) {
            console.error('Erro na requisição:', error);
            msgArea.innerHTML = `<div class="alert alert-danger">Erro de conexão com o servidor.</div>`;
        }
    });
}

export function auth() {
    configurarAlternancia();
    configurarLogin();
    configurarCadastro();

    mostrarPainel(window.location.hash === '#login' ? 'login' : 'cadastro');
}