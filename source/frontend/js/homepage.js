export function homepage() {
    // Variáveis de Estado (Simulação de Backend)
    let userProfile = {
        name: 'Ryan',
        email: 'ryan.morais@academico.ifpb.edu.br',
        state: 'Paraíba',
        phone: '8391234-5678',
        institution: 'IFPB'
    };
    
    // DADOS UNIFICADOS
    let currentServersData = [
        { id: 'server1', name: 'Servidor 1', ip: '10.0.10.10', port: '30120', status: 'Online', load: '25%' },
        { id: 'server2', name: 'Servidor 2', ip: '10.0.10.11', port: '30210', status: 'Online', load: '38%' },
        { id: 'server3', name: 'Servidor 3', ip: '10.0.10.12', port: '30120', status: 'Online', load: '19%' },
    ];

    // Elementos DOM
    const serverListContainer = document.getElementById('serverListContainer');
    const modalServerList = document.getElementById('modalServerList');
    const serverCountSpan = document.getElementById('serverCount');
    const updateMessage = document.getElementById('updateMessage');
    const addServerMessageDiv = document.getElementById('addServerMessage');

    // Elementos DOM do Mapa
    const serverNodesContainer = document.getElementById('serverNodesContainer');
    const serverDetailsCard = document.getElementById('serverDetailsCard');
    let activeServerNode = null; 
    
    // ===================================
    // FUNÇÕES DE PERFIL
    // ===================================

    function renderUserProfile() {
        const nameEl = document.getElementById('display-name');
        if(nameEl) nameEl.textContent = userProfile.name;
        
        const emailEl = document.getElementById('display-email');
        if(emailEl) emailEl.textContent = userProfile.email;
        
        const stateEl = document.getElementById('display-state');
        if(stateEl) stateEl.textContent = userProfile.state;
        
        const phoneEl = document.getElementById('display-phone');
        if(phoneEl) phoneEl.textContent = userProfile.phone;
        
        const instEl = document.getElementById('display-institution');
        if(instEl) instEl.textContent = userProfile.institution;
    }

    function updateAttributes() {
        const nameInput = document.getElementById('update-name').value.trim();
        const emailInput = document.getElementById('update-email').value.trim();
        const stateInput = document.getElementById('update-state').value.trim();
        const phoneInput = document.getElementById('update-phone').value.trim();
        const institutionInput = document.getElementById('update-institution').value.trim();
        
        const newPass = document.getElementById('update-newPassword').value;
        const confirmPass = document.getElementById('update-confirmPassword').value;
        
        let changesMade = false;
        
        updateMessage.style.display = 'block';
        updateMessage.className = 'mt-3 text-center fw-bold text-primary';
        updateMessage.textContent = 'Verificando alterações...';

        if (newPass || confirmPass) {
            if (newPass.length < 8) {
                updateMessage.className = 'mt-3 text-center fw-bold text-dark';
                updateMessage.textContent = 'Erro: A nova senha deve ter no mínimo 8 caracteres.';
                return;
            }
            if (newPass !== confirmPass) {
                updateMessage.className = 'mt-3 text-center fw-bold text-dark';
                updateMessage.textContent = 'Erro: As novas senhas não coincidem!';
                return;
            }
            changesMade = true;
        }

        if (nameInput) { userProfile.name = nameInput; changesMade = true; }
        if (emailInput) { userProfile.email = emailInput; changesMade = true; }
        if (stateInput) { userProfile.state = stateInput; changesMade = true; }
        if (phoneInput) { userProfile.phone = phoneInput; changesMade = true; }
        if (institutionInput) { userProfile.institution = institutionInput; changesMade = true; }

        if (changesMade) {
            renderUserProfile();
            document.getElementById('updateAttributesForm').reset();
            updateMessage.className = 'mt-3 text-center fw-bold text-primary';
            updateMessage.textContent = 'Perfil atualizado com sucesso! (Simulação)';

            setTimeout(() => {
                const modalElement = document.getElementById('updateAttributesModal');
                if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }
                updateMessage.style.display = 'none';
            }, 2000);
            
        } else {
            updateMessage.className = 'mt-3 text-center fw-bold text-dark';
            updateMessage.textContent = 'Nenhum campo foi preenchido para alteração.';
        }
    }

    // ===================================
    // FUNÇÕES DE SERVIDOR E MAPA
    // ===================================

    function renderServerListDashboard() {
        if (!serverListContainer) return;
        
        serverListContainer.innerHTML = '';
        if (currentServersData.length === 0) {
            serverListContainer.innerHTML = '<p class="text-dark">Nenhum servidor ativo.</p>';
            return;
        }

        currentServersData.forEach((server, index) => {
            const p = document.createElement('p');
            const statusClass = server.status === 'Online' ? 'text-success' : 'text-danger';
            p.innerHTML = `<strong class="${statusClass}"><i class="fas fa-circle me-1" style="font-size: 0.7rem;"></i>${server.name}</strong>: ${server.ip} | Carga: ${server.load}`;
            serverListContainer.appendChild(p);
        });
    }

    function renderServerListModal() {
        if (!modalServerList) return;
        
        modalServerList.innerHTML = '';
        if(serverCountSpan) serverCountSpan.textContent = currentServersData.length;

        if (currentServersData.length === 0) {
            modalServerList.innerHTML = '<div class="list-group-item text-center text-muted">Nenhum servidor cadastrado.</div>';
            return;
        }

        currentServersData.forEach((server, index) => {
            const item = document.createElement('div');
            item.className = 'list-group-item server-item';
            item.innerHTML = `
                <div>
                    <strong>${server.name} (#${index + 1})</strong>: ${server.ip} : ${server.port}
                </div>
                <button class="btn btn-sm btn-danger" onclick="removeServer(${index})">
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
        
        const newIp = ipInput.value.trim();
        const newPort = portInput.value.trim();
        
        addServerMessageDiv.style.display = 'block';

        // Validação simples de IP e Porta
        // Aceita IPs comuns (ex: 10.0.0.1 ou 192.168.0.1)
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(newIp) || isNaN(newPort) || newPort.length < 4) {
            addServerMessageDiv.className = 'col-12 mt-2 text-dark'; 
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
        
        addServerMessageDiv.className = 'col-12 mt-2 text-primary'; 
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

    // ===================================
    // FUNÇÕES DO MAPA DE TOPOLOGIA
    // ===================================

    function renderServerNodes() {
      if (!serverNodesContainer) return;
      
      serverNodesContainer.innerHTML = ''; 
      currentServersData.forEach(server => {
        const serverNode = document.createElement('div');
        serverNode.id = server.id;
        // Se estiver Offline, usa bg-danger (vermelho)
        serverNode.className = `node server ${server.status === 'Offline' ? 'bg-danger' : ''}`;
        serverNode.innerHTML = `
          <i class="fas fa-database"></i>
          <span>${server.name}</span>
        `;
        serverNode.onclick = (event) => showServerDetails(event, server);
        serverNodesContainer.appendChild(serverNode);
      });
    }

    function showServerDetails(event, server) {
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
      if (!serverDetailsCard) return;
      serverDetailsCard.classList.remove('active');
      if (activeServerNode) {
          activeServerNode.classList.remove('clicked');
          activeServerNode = null;
      }
    }

    function showUserDetails() {
      console.log('Detalhes do Usuário: Conectado à Aplicação FilePriv.');
      alert('Detalhes do Usuário: Conectado à Aplicação FilePriv.');
    }

    function showApplicationDetails() {
      console.log('Detalhes da Aplicação FilePriv: Gerencia o armazenamento e acesso distribuído.');
      alert('Aplicação FilePriv: Gerencia o armazenamento e acesso distribuído.');
    }

    // Evento para fechar detalhes ao clicar fora
    document.addEventListener('click', function(event) {
        if (!serverDetailsCard) return;
        const isClickInsideCard = serverDetailsCard.contains(event.target);
        const isClickOnServerNode = event.target.closest('.node.server');

        if (serverDetailsCard.classList.contains('active') && !isClickInsideCard && !isClickOnServerNode) {
            hideServerDetails();
        }
    });

    // --- EXPOR FUNÇÕES PARA O ESCOPO GLOBAL (WINDOW) ---
    // Isso é necessário porque os atributos onclick="..." no HTML buscam funções no window
    window.updateAttributes = updateAttributes;
    window.addServer = addServer;
    window.removeServer = removeServer;
    window.showUserDetails = showUserDetails;
    window.showApplicationDetails = showApplicationDetails;
    window.hideServerDetails = hideServerDetails;

    // Inicialização
    renderUserProfile();
    renderServerListDashboard();
    renderServerListModal();
    renderServerNodes();
}