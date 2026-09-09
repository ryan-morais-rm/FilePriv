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
            fecharModal('updateAttributesModal');
            updateMessage.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        updateMessage.className = 'mt-3 text-center fw-bold text-danger';
        updateMessage.textContent = error.message;
    }
}

/* ==========================================================================
   Provedores de Armazenamento (AWS S3 / Google Drive) — MOCK de frontend.
   Nada aqui fala com API, banco de dados ou gRPC — é só estado local
   (localStorage), incluindo os números de "atividade" de cada provedor,
   que são fixos e diferentes entre si só pra deixar visualmente claro que
   cada provedor tem seu próprio uso (opcional, então pode ser zero).
   ========================================================================== */

const AWS_KEY = 'filepriv_provider_aws';
const DRIVE_KEY = 'filepriv_provider_drive';

const AWS_MOCK_METRICS = { stored: 42, deleted: 1, today: 3 };
const DRIVE_MOCK_METRICS = { stored: 15, deleted: 0, today: 2 };

function fecharModal(id) {
    const modalElement = document.getElementById(id);
    if (modalElement && typeof window.bootstrap !== 'undefined' && window.bootstrap.Modal) {
        const modal = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
        modal.hide();
    }
}

function lerEstadoProvedor(chave) {
    try {
        return JSON.parse(localStorage.getItem(chave)) || { connected: false };
    } catch {
        return { connected: false };
    }
}

function salvarEstadoProvedor(chave, estado) {
    localStorage.setItem(chave, JSON.stringify(estado));
}

function mascarar(valor) {
    if (!valor || valor.length < 6) return '••••••';
    return `${valor.slice(0, 4)}••••${valor.slice(-2)}`;
}

function definirMetricas(prefixo, metricas, conectado) {
    document.getElementById(`${prefixo}MetricStored`).textContent = conectado ? metricas.stored : 0;
    document.getElementById(`${prefixo}MetricDeleted`).textContent = conectado ? metricas.deleted : 0;
    document.getElementById(`${prefixo}MetricToday`).textContent = conectado ? metricas.today : 0;
}

function atualizarVisualProvedores() {
    const aws = lerEstadoProvedor(AWS_KEY);
    const drive = lerEstadoProvedor(DRIVE_KEY);

    const awsNode = document.getElementById('awsNode');
    const driveNode = document.getElementById('driveNode');
    const connAws = document.getElementById('connectorAws');
    const connDrive = document.getElementById('connectorDrive');
    const awsStatusLabel = document.getElementById('awsStatusLabel');
    const driveStatusLabel = document.getElementById('driveStatusLabel');

    if (awsNode) awsNode.classList.toggle('connected', aws.connected);
    if (connAws) connAws.classList.toggle('connected', aws.connected);
    if (awsStatusLabel) {
        const texto = aws.connected ? `conectado · ${aws.bucket}` : 'não conectado';
        awsStatusLabel.textContent = texto;
        awsStatusLabel.title = texto;
    }

    if (driveNode) driveNode.classList.toggle('connected', drive.connected);
    if (connDrive) connDrive.classList.toggle('connected', drive.connected);
    if (driveStatusLabel) {
        const texto = drive.connected ? `conectado · ${drive.email}` : 'não conectado';
        driveStatusLabel.textContent = texto;
        driveStatusLabel.title = texto;
    }

    definirMetricas('aws', AWS_MOCK_METRICS, aws.connected);
    definirMetricas('drive', DRIVE_MOCK_METRICS, drive.connected);

    const chooseAwsStatus = document.getElementById('chooseAwsStatus');
    if (chooseAwsStatus) {
        chooseAwsStatus.textContent = aws.connected ? 'Conectado' : 'Não conectado';
        chooseAwsStatus.className = `d-block mt-1 ${aws.connected ? 'text-success fw-bold' : 'text-muted'}`;
    }
    const chooseDriveStatus = document.getElementById('chooseDriveStatus');
    if (chooseDriveStatus) {
        chooseDriveStatus.textContent = drive.connected ? 'Conectado' : 'Não conectado';
        chooseDriveStatus.className = `d-block mt-1 ${drive.connected ? 'text-success fw-bold' : 'text-muted'}`;
    }

    document.getElementById('awsDisconnectBtn')?.classList.toggle('d-none', !aws.connected);
    document.getElementById('driveDisconnectBtn')?.classList.toggle('d-none', !drive.connected);

    const awsBadgeTag = document.getElementById('awsBadgeTag');
    if (awsBadgeTag) awsBadgeTag.textContent = aws.connected ? 'conectado' : 'em breve';
    const driveBadgeTag = document.getElementById('driveBadgeTag');
    if (driveBadgeTag) driveBadgeTag.textContent = drive.connected ? 'conectado' : 'em breve';
}

function mostrarEtapaProvedor(nome) {
    document.getElementById('providerStepChoose').style.display = nome === 'choose' ? 'block' : 'none';
    document.getElementById('providerStepAws').style.display = nome === 'aws' ? 'block' : 'none';
    document.getElementById('providerStepDrive').style.display = nome === 'drive' ? 'block' : 'none';
}

function configurarModalProvedores() {
    document.getElementById('chooseAwsBtn')?.addEventListener('click', () => mostrarEtapaProvedor('aws'));
    document.getElementById('chooseDriveBtn')?.addEventListener('click', () => mostrarEtapaProvedor('drive'));
    document.querySelectorAll('.voltar-etapa').forEach((btn) => {
        btn.addEventListener('click', () => mostrarEtapaProvedor('choose'));
    });

    document.getElementById('manageServersModal')?.addEventListener('show.bs.modal', () => {
        mostrarEtapaProvedor('choose');
        atualizarVisualProvedores();

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const emailPreview = document.getElementById('driveEmailPreview');
        if (emailPreview) emailPreview.textContent = userData.email || 'seu e-mail cadastrado';
    });

    document.getElementById('awsForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const bucket = document.getElementById('awsBucket').value.trim();
        const accessKey = document.getElementById('awsAccessKey').value.trim();

        salvarEstadoProvedor(AWS_KEY, {
            connected: true,
            bucket,
            akMasked: mascarar(accessKey)
        });

        const msg = document.getElementById('awsMsg');
        msg.innerHTML = `<div class="alert alert-success mt-3 mb-0">Conectado ao bucket <strong>${bucket}</strong>.</div>`;
        atualizarVisualProvedores();

        setTimeout(() => {
            fecharModal('manageServersModal');
            msg.innerHTML = '';
            document.getElementById('awsForm').reset();
        }, 1400);
    });

    document.getElementById('driveConnectBtn')?.addEventListener('click', () => {
        const btn = document.getElementById('driveConnectBtn');
        const msg = document.getElementById('driveMsg');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const originalHtml = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Conectando...`;

        setTimeout(() => {
            salvarEstadoProvedor(DRIVE_KEY, { connected: true, email: (userData.email || 'usuario@filepriv').toLowerCase() });
            msg.innerHTML = `<div class="alert alert-success mt-3 mb-0">Google Drive conectado.</div>`;
            atualizarVisualProvedores();
            btn.disabled = false;
            btn.innerHTML = originalHtml;

            setTimeout(() => {
                fecharModal('manageServersModal');
                msg.innerHTML = '';
            }, 1000);
        }, 1200);
    });

    document.getElementById('awsDisconnectBtn')?.addEventListener('click', () => {
        salvarEstadoProvedor(AWS_KEY, { connected: false });
        atualizarVisualProvedores();
        mostrarEtapaProvedor('choose');
    });

    document.getElementById('driveDisconnectBtn')?.addEventListener('click', () => {
        salvarEstadoProvedor(DRIVE_KEY, { connected: false });
        atualizarVisualProvedores();
        mostrarEtapaProvedor('choose');
    });
}

async function carregarMetricasAplicacao() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/arquivos/metricas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar métricas.');

        const dados = await response.json();
        document.getElementById('appMetricStored').textContent = dados.armazenados;
        document.getElementById('appMetricDeleted').textContent = dados.excluidos7dias;
        document.getElementById('appMetricToday').textContent = dados.uploadsHoje;
    } catch (error) {
        console.error('Erro ao carregar métricas da aplicação:', error);
    }
}

window.updateAttributes = updateAttributes;

export async function homepage() {
    await renderUserProfile();
    configurarModalProvedores();
    atualizarVisualProvedores();
    await carregarMetricasAplicacao();
}