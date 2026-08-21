async function renderUserProfile() {
    const nameEl = document.getElementById('display-name'); 
    const emailEl = document.getElementById('display-email');         
    const userDataJSON = localStorage.getItem('userData'); 
    const token = localStorage.getItem('token'); 

    if (!userDataJSON || !token) {
        console.warn("Usuário não autenticado. Redirecionando..."); 
        window.location.href = 'login.html';
        return; 
    }
    const userLocal = JSON.parse(userDataJSON); 

    try {
        const response = await fetch(`/usuarios/perfil/${userLocal.id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401 || response.status === 403) {
            alert("Sua sessão expirou. Por favor, faça login novamente.");
            localStorage.removeItem('userData');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) throw new Error('Erro ao buscar dados no servidor'); 

        const userAtualizado = await response.json(); 
        if(nameEl) nameEl.textContent = userAtualizado.nome;
        if(emailEl) emailEl.textContent = userAtualizado.email;
        
        localStorage.setItem('userData', JSON.stringify(userAtualizado));
        console.log("Perfil carregado via JWT.");
        
    } catch (error) {
        console.error("Erro ou Fallback: ", error); 
        if (nameEl) nameEl.textContent = userLocal.nome; 
        if (emailEl) emailEl.textContent = userLocal.email; 
    }
}

async function updateAttributes() {
    const nameInput = document.getElementById('update-name').value.trim();
    const emailInput = document.getElementById('update-email').value.trim();
    const currentPass = document.getElementById('update-currentPassword').value;
    const newPass = document.getElementById('update-newPassword').value;
    const confirmPass = document.getElementById('update-confirmPassword').value;
    
    const updateMessage = document.getElementById('updateMessage');
    
    updateMessage.style.display = 'block';
    updateMessage.className = 'mt-3 text-center fw-bold text-primary';
    updateMessage.textContent = 'Salvando no servidor...';

    if (newPass || confirmPass) {
        if (newPass.length < 8) {
            updateMessage.className = 'mt-3 text-center fw-bold text-danger';
            updateMessage.textContent = 'Erro: A nova senha deve ter no mínimo 8 caracteres.';
            return;
        }
        if (newPass !== confirmPass) {
            updateMessage.className = 'mt-3 text-center fw-bold text-danger';
            updateMessage.textContent = 'Erro: As novas senhas não coincidem!';
            return;
        }
        if (!currentPass) {
            updateMessage.className = 'mt-3 text-center fw-bold text-warning';
            updateMessage.textContent = 'Aviso: Para trocar a senha, digite sua senha atual.';
            return;
        }
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/usuarios/perfil', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                nome: nameInput, 
                email: emailInput, 
                senhaAtual: currentPass, 
                novaSenha: newPass 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao atualizar perfil.');
        }

        let userLocal = JSON.parse(localStorage.getItem('userData') || '{}');
        userLocal.nome = data.usuario.nome;
        userLocal.email = data.usuario.email;
        localStorage.setItem('userData', JSON.stringify(userLocal));

        renderUserProfile();
        
        document.getElementById('updateAttributesForm').reset();
        updateMessage.className = 'mt-3 text-center fw-bold text-success';
        updateMessage.textContent = 'Perfil atualizado com sucesso no Banco de Dados!';

        setTimeout(() => {
            const modalElement = document.getElementById('updateAttributesModal');
            if (typeof window.bootstrap !== 'undefined' && window.bootstrap.Modal) {
                let modal = window.bootstrap.Modal.getInstance(modalElement);
                if (!modal) modal = new window.bootstrap.Modal(modalElement);
                modal.hide();
            }
            updateMessage.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        updateMessage.className = 'mt-3 text-center fw-bold text-danger';
        updateMessage.textContent = error.message;
    }
}

document.addEventListener('click', function(event) {
    const serverDetailsCard = document.getElementById('serverDetailsCard');
    if (!serverDetailsCard) return;
    
    const isClickInsideCard = serverDetailsCard.contains(event.target);
    const isClickOnServerNode = event.target.closest('.node.server');

    if (serverDetailsCard.classList.contains('active') && !isClickInsideCard && !isClickOnServerNode) {
        hideServerDetails();
    }
});

window.updateAttributes = updateAttributes;
window.addServer = addServer;
window.removeServer = removeServer;
window.showServerDetails = showServerDetails;
window.hideServerDetails = hideServerDetails;
window.showUserDetails = () => alert('Detalhes do Usuário: Conectado à Aplicação FilePriv.');
window.showApplicationDetails = () => alert('Aplicação FilePriv: Gerencia o armazenamento e acesso distribuído.');

export async function homepage() {
    await renderUserProfile();
}