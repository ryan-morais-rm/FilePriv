import { labelCategoriaUsuario, slugCategoriaUsuario } from './categoriasLabels.js';

let categoriasPerfilDisponiveis = [];
let paginaTravada = false;

async function carregarCategoriasPerfilDisponiveis() {
    try {
        const response = await fetch('/usuarios/categorias-perfil');
        if (!response.ok) throw new Error();
        const data = await response.json();
        categoriasPerfilDisponiveis = data.categorias || [];
    } catch (error) {
        console.error('Erro ao carregar categorias de perfil:', error);
        categoriasPerfilDisponiveis = [];
    }
}

async function renderUserProfile() {
    const nameEl = document.getElementById('display-name'); 
    const categoriaEl = document.getElementById('display-categoria');
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
        if(categoriaEl) categoriaEl.textContent = `/${slugCategoriaUsuario(userAtualizado.categoria_perfil)}`;
        
        localStorage.setItem('userData', JSON.stringify(userAtualizado));
        
    } catch (error) {
        console.error("Erro ou Fallback: ", error); 
        if (nameEl) nameEl.textContent = userLocal.nome; 
        if (emailEl) emailEl.textContent = userLocal.email; 
        if (categoriaEl) categoriaEl.textContent = `/${slugCategoriaUsuario(userLocal.categoria_perfil)}`;
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

function travarPagina(mensagem) {
    paginaTravada = true;
    const overlay = document.getElementById('pageLockOverlay');
    if (overlay) {
        const texto = overlay.querySelector('.page-lock-text');
        if (texto) texto.textContent = mensagem || 'Processando, aguarde...';
        overlay.style.display = 'flex';
    }
    document.getElementById('btnTrocarPerfil')?.setAttribute('disabled', 'true');
    document.getElementById('trocar-perfil-select')?.setAttribute('disabled', 'true');
}

function destravarPagina() {
    paginaTravada = false;
    const overlay = document.getElementById('pageLockOverlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('btnTrocarPerfil')?.removeAttribute('disabled');
    document.getElementById('trocar-perfil-select')?.removeAttribute('disabled');
}

function popularSelectTrocaPerfil(categoriaAtual) {
    const select = document.getElementById('trocar-perfil-select');
    if (!select) return;

    select.innerHTML = '<option value="" selected disabled>Selecione um novo perfil...</option>';
    categoriasPerfilDisponiveis
        .filter((valor) => valor !== categoriaAtual)
        .forEach((valor) => {
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = labelCategoriaUsuario(valor);
            select.appendChild(option);
        });
}

async function trocarPerfil() {
    const select = document.getElementById('trocar-perfil-select');
    const novoPerfil = select?.value;
    const msgEl = document.getElementById('trocaPerfilMessage');

    if (!novoPerfil) {
        msgEl.style.display = 'block';
        msgEl.className = 'mt-2 small fw-bold text-warning';
        msgEl.textContent = 'Selecione um novo perfil antes de confirmar.';
        return;
    }

    const confirmar = confirm(
        'Trocar de perfil move automaticamente os arquivos que não pertencem às categorias do novo perfil para "Migração". Deseja continuar?'
    );
    if (!confirmar) return;

    travarPagina('Migrando arquivos para o novo perfil, aguarde...');

    const token = localStorage.getItem('token');
    const userLocal = JSON.parse(localStorage.getItem('userData') || '{}');

    try {
        const response = await fetch('/usuarios/perfil', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: userLocal.nome,
                email: userLocal.email,
                categoria_perfil: novoPerfil
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao trocar de perfil.');

        userLocal.categoria_perfil = data.usuario.categoria_perfil;
        localStorage.setItem('userData', JSON.stringify(userLocal));

        const nameEl = document.getElementById('display-name');
        const categoriaEl = document.getElementById('display-categoria');
        if (nameEl) nameEl.textContent = data.usuario.nome;
        if (categoriaEl) categoriaEl.textContent = `/${slugCategoriaUsuario(data.usuario.categoria_perfil)}`;

        const label = document.getElementById('perfil-atual-label');
        if (label) label.textContent = labelCategoriaUsuario(data.usuario.categoria_perfil);
        popularSelectTrocaPerfil(data.usuario.categoria_perfil);

        const qtd = data.arquivosMigrados ?? 0;
        msgEl.style.display = 'block';
        msgEl.className = 'mt-2 small fw-bold text-success';
        msgEl.textContent = qtd > 0
            ? `Perfil atualizado! ${qtd} arquivo(s) movido(s) para a categoria "Migração".`
            : 'Perfil atualizado! Nenhum arquivo precisou ser migrado.';

    } catch (error) {
        msgEl.style.display = 'block';
        msgEl.className = 'mt-2 small fw-bold text-danger';
        msgEl.textContent = error.message;
    } finally {
        destravarPagina();
    }
}

function configurarTrocaPerfil() {
    document.getElementById('btnTrocarPerfil')?.addEventListener('click', trocarPerfil);

    // Impede fechar o modal (ESC, clique no fundo, botão X) enquanto a
    // migração está em andamento.
    document.getElementById('updateAttributesModal')?.addEventListener('hide.bs.modal', (event) => {
        if (paginaTravada) event.preventDefault();
    });

    document.getElementById('updateAttributesModal')?.addEventListener('show.bs.modal', () => {
        const userLocal = JSON.parse(localStorage.getItem('userData') || '{}');
        const categoriaAtual = userLocal.categoria_perfil;

        const nameInput = document.getElementById('update-name');
        const emailInput = document.getElementById('update-email');
        if (nameInput) nameInput.value = userLocal.nome || '';
        if (emailInput) emailInput.value = userLocal.email || '';

        const label = document.getElementById('perfil-atual-label');
        if (label) label.textContent = labelCategoriaUsuario(categoriaAtual);
        popularSelectTrocaPerfil(categoriaAtual);

        const msgEl = document.getElementById('trocaPerfilMessage');
        if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
    });
}

/* Provedores de Armazenamento (AWS S3 / Google Drive) */

function fecharModal(id) {
    const modalElement = document.getElementById(id);
    if (modalElement && typeof window.bootstrap !== 'undefined' && window.bootstrap.Modal) {
        const modal = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
        modal.hide();
    }
}

function definirMetricas(prefixo, metricas, conectado) {
    document.getElementById(`${prefixo}MetricStored`).textContent = conectado ? metricas.stored : 0;
    document.getElementById(`${prefixo}MetricDeleted`).textContent = conectado ? metricas.deleted : 0;
    document.getElementById(`${prefixo}MetricToday`).textContent = conectado ? metricas.today : 0;
}

async function atualizarVisualProvedores() {
    const token = localStorage.getItem('token');
    
    let aws = { connected: false, bucket: '', metrics: { stored: 0, deleted: 0, today: 0 } };
    let drive = { connected: false };

    if (token) {
        try {
            const [respMetricas, respProvedores] = await Promise.all([
                fetch('/usuarios/provedores/metricas', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/usuarios/provedores', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (respMetricas.ok) {
                const data = await respMetricas.json();
                const s3Data = data.s3;
                if (s3Data && s3Data.conectado) {
                    aws = {
                        connected: true,
                        bucket: s3Data.bucket,
                        metrics: { stored: s3Data.stored, deleted: s3Data.deleted, today: s3Data.today }
                    };
                }
            }
            if (respProvedores.ok) {
                const data = await respProvedores.json();
                if (data.drive && data.drive.conectado) {
                    drive = { connected: true };
                }
            }
        } catch (error) {
            console.error('Erro ao buscar status/métricas dos provedores no backend:', error);
        }
    }

    const awsNode = document.getElementById('awsNode');
    const driveNode = document.getElementById('driveNode');
    const connAws = document.getElementById('connectorAws');
    const connDrive = document.getElementById('connectorDrive');
    const awsStatusLabel = document.getElementById('awsStatusLabel');
    const driveStatusLabel = document.getElementById('driveStatusLabel');

    if (awsNode) awsNode.classList.toggle('connected', !!aws.connected);
    if (connAws) connAws.classList.toggle('connected', !!aws.connected);
    if (awsStatusLabel) {
        const texto = aws.connected ? `conectado · ${aws.bucket || 'AWS S3'}` : 'não conectado';
        awsStatusLabel.textContent = texto;
        awsStatusLabel.title = texto;
    }

    if (driveNode) driveNode.classList.toggle('connected', !!drive.connected);
    if (connDrive) connDrive.classList.toggle('connected', !!drive.connected);
    if (driveStatusLabel) {
        const texto = drive.connected ? 'conectado' : 'não conectado';
        driveStatusLabel.textContent = texto;
        driveStatusLabel.title = texto;
    }

    definirMetricas('aws', aws.metrics, aws.connected);
    definirMetricas('drive', drive.metrics, drive.connected);

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

    document.getElementById('manageServersModal')?.addEventListener('show.bs.modal', async () => {
        mostrarEtapaProvedor('choose');
        await atualizarVisualProvedores();
    });

    document.getElementById('awsForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const bucket = document.getElementById('awsBucket').value.trim();
        const accessKey = document.getElementById('awsAccessKey').value.trim();
        const secretKey = document.getElementById('awsSecretKey').value.trim();
        const msg = document.getElementById('awsMsg');
        const token = localStorage.getItem('token');
        const btnSubmit = event.target.querySelector('button[type="submit"]');

        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Conectando...';

        try {
            const response = await fetch('/usuarios/provedores/s3', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    bucket: bucket, 
                    access_key: accessKey, 
                    secret_key: secretKey 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha ao conectar na AWS.');
            }

            msg.innerHTML = `<div class="alert alert-success mt-3 mb-0">Conectado ao bucket <strong>${bucket}</strong>.</div>`;
            await atualizarVisualProvedores();

            setTimeout(() => {
                fecharModal('manageServersModal');
                msg.innerHTML = '';
                document.getElementById('awsForm').reset();
            }, 1400);

        } catch (error) {
            msg.innerHTML = `<div class="alert alert-danger mt-3 mb-0">${error.message}</div>`;
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
    });

    document.getElementById('driveConnectBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('driveConnectBtn');
        const msg = document.getElementById('driveMsg');
        const token = localStorage.getItem('token');
        const originalHtml = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Redirecionando...`;

        try {
            const response = await fetch('/usuarios/provedores/drive/conectar', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok || !data.url) throw new Error(data.error || 'Falha ao iniciar conexão com o Drive.');

            window.location.href = data.url; 
        } catch (error) {
            msg.innerHTML = `<div class="alert alert-danger mt-3 mb-0">${error.message}</div>`;
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });

    document.getElementById('awsDisconnectBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('awsDisconnectBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Desconectando...';
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/usuarios/provedores/s3', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Falha ao desconectar da AWS.');

            await atualizarVisualProvedores();
            mostrarEtapaProvedor('choose');
        } catch (error) {
            alert(error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    document.getElementById('driveDisconnectBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('driveDisconnectBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Desconectando...';
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/usuarios/provedores/drive', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Falha ao desconectar do Drive.');

            await atualizarVisualProvedores();
            mostrarEtapaProvedor('choose');
        } catch (error) {
            alert(error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

function mostrarMensagemRetornoDrive() {
    const params = new URLSearchParams(window.location.search);
    const erro = params.get('drive_erro');
    const conectado = params.get('drive_conectado');

    if (!erro && !conectado) return;

    const mensagens = {
        state_invalido: 'Sessão expirada durante a conexão com o Drive. Tente novamente.',
        falha_conexao: 'Não foi possível conectar ao Google Drive. Tente novamente.',
        interno: 'Erro interno ao conectar ao Google Drive.'
    };

    alert(conectado ? 'Google Drive conectado com sucesso!' : (mensagens[erro] || 'Falha ao conectar ao Google Drive.'));
    window.history.replaceState({}, '', window.location.pathname); // limpa a URL sem recarregar
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
    mostrarMensagemRetornoDrive();
    await carregarCategoriasPerfilDisponiveis();
    await renderUserProfile();
    configurarModalProvedores();
    configurarTrocaPerfil();
    atualizarVisualProvedores();
    await carregarMetricasAplicacao();
}