
let currentServersData = [
    { id: 'node-FilePriv1', name: 'Servidor 1', ip: '192.168.60.10', port: '22', status: 'Online', load: '25%' },
    { id: 'node-FilePriv2', name: 'Servidor 2', ip: '192.168.60.11', port: '22', status: 'Online', load: '38%' },
    { id: 'node-FilePriv3', name: 'Servidor 3', ip: '192.168.60.12', port: '22', status: 'Online', load: '19%' },
];

let activeServerNode = null;

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

function updateAttributes() {
    const nameInput = document.getElementById('update-name').value.trim();
    const emailInput = document.getElementById('update-email').value.trim();
    const newPass = document.getElementById('update-newPassword').value;
    const confirmPass = document.getElementById('update-confirmPassword').value;
    const updateMessage = document.getElementById('updateMessage');
    
    let changesMade = false;
    
    updateMessage.style.display = 'block';
    updateMessage.className = 'mt-3 text-center fw-bold text-primary';
    updateMessage.textContent = 'Verificando alterações...';

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
        changesMade = true;
    }

    let userLocal = JSON.parse(localStorage.getItem('userData') || '{}');

    if (nameInput) { userLocal.nome = nameInput; changesMade = true; }
    if (emailInput) { userLocal.email = emailInput; changesMade = true; }

    if (changesMade) {
        localStorage.setItem('userData', JSON.stringify(userLocal));
        renderUserProfile();
        
        document.getElementById('updateAttributesForm').reset();
        updateMessage.className = 'mt-3 text-center fw-bold text-success';
        updateMessage.textContent = 'Perfil atualizado com sucesso! (Simulação)';

        setTimeout(() => {
            const modalElement = document.getElementById('updateAttributesModal');
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            updateMessage.style.display = 'none';
        }, 2000);
        
    } else {
        updateMessage.className = 'mt-3 text-center fw-bold text-warning';
        updateMessage.textContent = 'Nenhum campo foi preenchido para alteração.';
    }
}

function renderServerListDashboard() {
    const serverListContainer = document.getElementById('serverListContainer');
    if (!serverListContainer) return;
    
    serverListContainer.innerHTML = '';
    if (currentServersData.length === 0) {
        serverListContainer.innerHTML = '<p class="text-dark">Nenhum servidor ativo.</p>';
        return;
    }

    currentServersData.forEach((server) => {
        const p = document.createElement('p');
        const statusClass = server.status === 'Online' ? 'text-success' : 'text-danger';
        p.innerHTML = `<strong class="${statusClass}"><i class="fas fa-circle me-1" style="font-size: 0.7rem;"></i>${server.name}</strong>: ${server.ip} | Carga: ${server.load}`;
        serverListContainer.appendChild(p);
    });
}

function renderServerListModal() {
    const modalServerList = document.getElementById('modalServerList');
    const serverCountSpan = document.getElementById('serverCount');
    
    if (!modalServerList) return;
    
    modalServerList.innerHTML = '';
    if(serverCountSpan) serverCountSpan.textContent = currentServersData.length;

    if (currentServersData.length === 0) {
        modalServerList.innerHTML = '<div class="list-group-item text-center text-muted">Nenhum servidor cadastrado.</div>';
        return;
    }

    currentServersData.forEach((server, index) => {
        const item = document.createElement('div');
        item.className = 'list-group-item server-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <div>
                <strong>${server.name} (#${index + 1})</strong>: ${server.ip} : ${server.port}
            </div>
            <button class="btn btn-sm btn-danger" onclick="window.removeServer(${index})">
                Remover
            </button>
        `;
        modalServerList.appendChild(item);
    });
}

function addServer(event) {
    event.preventDefault();
    
    const ipInput = document.getElementById('newServerIp');
    const portInput = document.getElementById('newServerPort');
    const addServerMessageDiv = document.getElementById('addServerMessage');
    
    const newIp = ipInput.value.trim();
    const newPort = portInput.value.trim();
    
    addServerMessageDiv.style.display = 'block';

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp) || isNaN(newPort) || newPort.length < 2) {
        addServerMessageDiv.className = 'col-12 mt-2 text-danger fw-bold'; 
        addServerMessageDiv.textContent = 'Erro: Verifique o formato do IP (ex: 192.168.1.1) e a Porta.';
        return;
    }
    
    const newId = `server${currentServersData.length + 1}`;

    currentServersData.push({ 
        id: newId, 
        name: `Servidor ${currentServersData.length + 1}`,
        ip: newIp, 
        port: newPort,
        status: 'Online', 
        load: '0%' 
    });
    
    ipInput.value = '';
    portInput.value = '';
    
    addServerMessageDiv.className = 'col-12 mt-2 text-success fw-bold'; 
    addServerMessageDiv.textContent = `Servidor ${newIp}:${newPort} adicionado com sucesso!`;

    renderServerListDashboard();
    renderServerListModal();
    renderServerNodes(); 

    setTimeout(() => {
        addServerMessageDiv.style.display = 'none';
    }, 3000);
}

function removeServer(indexToRemove) {
    currentServersData.splice(indexToRemove, 1);
    renderServerListDashboard();
    renderServerListModal();
    renderServerNodes(); 
}

function renderServerNodes() {
    const serverNodesContainer = document.getElementById('serverNodesContainer');
    if (!serverNodesContainer) return;
  
    serverNodesContainer.innerHTML = ''; 
    currentServersData.forEach(server => {
        const serverNode = document.createElement('div');
        serverNode.id = server.id;
        serverNode.className = `node server ${server.status === 'Offline' ? 'bg-danger' : ''}`;
        serverNode.innerHTML = `
          <i class="fas fa-database"></i>
          <span>${server.name}</span>
        `;
        serverNode.onclick = (event) => window.showServerDetails(event, server);
        serverNodesContainer.appendChild(serverNode);
    });
}

function showServerDetails(event, server) {
    const serverDetailsCard = document.getElementById('serverDetailsCard');
    const serverNodesContainer = document.getElementById('serverNodesContainer');
    if (!serverDetailsCard) return;

    if (activeServerNode && activeServerNode !== event.currentTarget) {
        activeServerNode.classList.remove('clicked');
    }

    activeServerNode = event.currentTarget;
    activeServerNode.classList.add('clicked'); 
    
    document.getElementById('detail-server-name').textContent = server.name;
    document.getElementById('detail-server-ip').textContent = server.ip;
    document.getElementById('detail-server-port').textContent = server.port;
    document.getElementById('detail-server-load').textContent = server.load;

    const statusSpan = document.getElementById('detail-server-status');
    statusSpan.textContent = server.status;
    statusSpan.className = ''; 
    if (server.status === 'Online') {
        statusSpan.classList.add('text-success', 'fw-bold');
    } else {
        statusSpan.classList.add('text-danger', 'fw-bold');
    }

    const rect = activeServerNode.getBoundingClientRect();
    const mapRect = serverNodesContainer.closest('.topology-map').getBoundingClientRect();
    
    serverDetailsCard.style.top = `${rect.top - mapRect.top - 150}px`; 
    serverDetailsCard.style.left = `${rect.left - mapRect.left + (rect.width / 2)}px`; 
    
    serverDetailsCard.classList.add('active'); 
}

function hideServerDetails() {
    const serverDetailsCard = document.getElementById('serverDetailsCard');
    if (!serverDetailsCard) return;
    
    serverDetailsCard.classList.remove('active');
    if (activeServerNode) {
        activeServerNode.classList.remove('clicked');
        activeServerNode = null;
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
    renderServerListDashboard();
    renderServerListModal();
    renderServerNodes();
}