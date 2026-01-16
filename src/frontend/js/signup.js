export function signUP() {
    const form = document.getElementById('registerForm');
    const msgArea = document.getElementById('messageArea');

    if (!form || !msgArea) {
        console.error("Elementos do formulário não encontrados.");
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const user = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
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

            const response = await fetch('http://localhost:3000/usuarios/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: user,
                    email: email,
                    senha: senha 
                })
            });

            const data = await response.json();

            if (response.ok) {
                msgArea.innerHTML = `
                    <div class="alert alert-success">
                        Bem-vindo(a), <strong>${data.nome}</strong>!<br>
                        Cadastro realizado no banco de dados. Redirecionando...
                    </div>`;

                setTimeout(() => {
                    window.location.href = "../html/login.html";
                }, 1500);
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