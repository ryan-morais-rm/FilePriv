export function signUP() {
    const form = document.getElementById('registerForm');
    const msgArea = document.getElementById('messageArea');

    // Verificação de segurança para evitar erros se o elemento não existir na página
    if (!form || !msgArea) {
        console.error("Elementos do formulário não encontrados.");
        return;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const user = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value.trim();
      const confirmPass = document.getElementById('confirmPassword').value.trim();

      if (!user || !email || !pass || !confirmPass) {
        msgArea.innerHTML = `<div class="alert alert-danger">Preencha todos os campos!</div>`;
        return;
      }
      
      if (pass !== confirmPass) {
        msgArea.innerHTML = `<div class="alert alert-danger">As senhas digitadas não coincidem!</div>`;
        return;
      }

      if (pass.length < 6) {
        msgArea.innerHTML = `<div class="alert alert-danger">A senha deve ter no mínimo 6 caracteres.</div>`;
        return;
      }

      msgArea.innerHTML = `
        <div class="alert alert-success">
          Bem-vindo(a), <strong>${user}</strong>!<br>
          Simulação de cadastro bem-sucedida. Redirecionando...
        </div>`;

      setTimeout(() => {
        window.location.href = "../html/homepage.html";
      }, 1500);
    });
}