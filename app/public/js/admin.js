function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function mostrarPainel() {
    document.getElementById('admin-login-card').style.display = 'none';
    document.getElementById('admin-painel').style.display = 'block';
    carregarServidores();
}

function mostrarLogin() {
    document.getElementById('admin-login-card').style.display = 'block';
    document.getElementById('admin-painel').style.display = 'none';
}

async function fazerLogin(event) {
    event.preventDefault();
    const usuario = document.getElementById('admin-usuario').value;
    const senha = document.getElementById('admin-senha').value;
    const msg = document.getElementById('admin-login-msg');
    msg.innerHTML = '';

    try {
        const resp = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha })
        });
        const data = await resp.json();

        if (!resp.ok) {
            msg.innerHTML = `<div class="alert alert-danger mt-3">${data.message || 'Credenciais inválidas.'}</div>`;
            return;
        }

        localStorage.setItem('adminToken', data.token);
        mostrarPainel();
    } catch (e) {
        msg.innerHTML = `<div class="alert alert-danger mt-3">Falha ao conectar com o servidor.</div>`;
    }
}

async function popularSubnet(event) {
    event.preventDefault();
    const msg = document.getElementById('popular-msg');
    msg.innerHTML = '';

    const body = {
        subnet: document.getElementById('subnet').value.trim(),
        porta: Number(document.getElementById('porta-ssh').value),
        usuario_ssh: document.getElementById('usuario-ssh').value.trim(),
        chave_privada: document.getElementById('chave-privada').value,
        diretorio_remoto: document.getElementById('diretorio-remoto').value.trim()
    };

    try {
        const resp = await fetch('/admin/servidores/popular-subnet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAdminToken()}`
            },
            body: JSON.stringify(body)
        });
        const data = await resp.json();

        if (!resp.ok) {
            msg.innerHTML = `<div class="alert alert-danger mt-3">${data.error || 'Falha ao popular servidores.'}</div>`;
            return;
        }

        msg.innerHTML = `<div class="alert alert-success mt-3">${data.message}</div>`;
        carregarServidores();
    } catch (e) {
        msg.innerHTML = `<div class="alert alert-danger mt-3">Falha ao conectar com o servidor.</div>`;
    }
}

async function carregarServidores() {
    const tbody = document.getElementById('servidores-tbody');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3">Carregando...</td></tr>';

    try {
        const resp = await fetch('/admin/servidores', {
            headers: { 'Authorization': `Bearer ${getAdminToken()}` }
        });

        if (resp.status === 401 || resp.status === 403) {
            localStorage.removeItem('adminToken');
            mostrarLogin();
            return;
        }

        const servidores = await resp.json();

        if (servidores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">Nenhum servidor cadastrado ainda.</td></tr>';
            return;
        }
        tbody.innerHTML = servidores.map((s) => {
        const badge = s.status === 'ATIVO' ? 'text-bg-success'
            : s.status === 'ERRO' ? 'text-bg-danger'
            : 'text-bg-secondary';

        return `
                <tr>
                    <td class="mono">${s.host}</td>
                    <td class="mono">${s.porta}</td>
                    <td><span class="badge ${badge}">${s.status}</span></td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-3">Falha ao carregar servidores.</td></tr>';
    }
}

export function admin() {
    document.getElementById('admin-login-form').addEventListener('submit', fazerLogin);
    document.getElementById('popular-form').addEventListener('submit', popularSubnet);

    if (getAdminToken()) {
        mostrarPainel();
    } else {
        mostrarLogin();
    }
}