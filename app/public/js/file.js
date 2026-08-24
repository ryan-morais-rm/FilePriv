let MAX_SIZE_MB = 100;
let ALLOWED_EXTS = ['pdf', 'docx', 'jpg', 'jpeg', 'png']; 

async function fetchRules() {
    try {
        const response = await fetch('/arquivos/regras');
        if (response.ok) {
            const rules = await response.json();
            MAX_SIZE_MB = rules.maxSizeMB;
            ALLOWED_EXTS = rules.allowedExtensions;
            console.log("Regras atualizadas da API:", rules);
        }
    } catch (error) {
        console.error("Erro ao buscar regras, usando padrão.", error);
    }
}

async function renderUserProfile(token, userDataJSON) {
    if (!userDataJSON || !token) return;
    
    const userLocal = JSON.parse(userDataJSON);
    const nameEl = document.getElementById('display-name');

    try {
        const response = await fetch(`/usuarios/perfil/${userLocal.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Erro ao buscar dados no servidor'); 
        
        const userAtualizado = await response.json(); 
        if(nameEl) nameEl.textContent = userAtualizado.nome;
        console.log("Perfil carregado do Banco de Dados.");
        
    } catch (error) {
        console.error("Erro no backend, usando cache local: ", error); 
        if (nameEl) nameEl.textContent = userLocal.nome;  
    }
}

async function updateCounters(token) {
    if (!token) return;
    
    try {
        const response = await fetch(`/arquivos/armazenados/quantidade`, {
            headers: { 'Authorization': `Bearer ${token}`}
        });
         
        if (response.ok) {
            const data = await response.json(); 
            const storedEl = document.getElementById('storedFilesCount'); 
            if (storedEl) {
                storedEl.innerHTML = `<strong>${data.total}</strong> arquivos armazenados`;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar contagem:", error); 
    }
}

function isValidExtension(filename) {
    const parts = filename.split('.');
    if (parts.length <= 1) return false; 
    const ext = parts.pop().toLowerCase();
    return ALLOWED_EXTS.includes(ext); 
}

async function handleFileUpload(event, token, form, statusDiv, btn) {
    event.preventDefault(); 

    const fileName = document.getElementById('fileName').value.trim(); 
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const fileDesc = document.getElementById('fileDesc') ? document.getElementById('fileDesc').value : "";

    if (!file) {
        statusDiv.innerHTML = `<div class="alert alert-danger mt-3">Selecione um arquivo!</div>`;
        return;
    }

    if (!isValidExtension(file.name)) {
        statusDiv.innerHTML = `<div class="alert alert-warning mt-3">
            <strong>Formato não suportado.</strong><br> 
            Formatos permitidos: ${ALLOWED_EXTS.join(', ').toUpperCase()}
        </div>`;
        return;
    }

    const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        statusDiv.innerHTML = `<div class="alert alert-warning mt-3">
            <strong>Arquivo muito grande!</strong><br> 
            O tamanho máximo permitido é de ${MAX_SIZE_MB}MB. O seu arquivo tem ${fileSizeMB}MB.
        </div>`;
        return;
    }

    const userData = localStorage.getItem('userData');
    if (!userData) {
        statusDiv.innerHTML = `<div class="alert alert-danger mt-3">Você precisa estar logado!</div>`;
        return;
    }

    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Enviando...`;
    statusDiv.innerHTML = '';

    try {
        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('descricao', fileDesc);
        formData.append('nome_customizado', fileName);

        const response = await fetch(`/arquivos/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Falha no envio');

        statusDiv.innerHTML = `<div class="alert alert-success mt-3">
            Arquivo enviado com sucesso!<br>
            Redirecionando...
        </div>`;
        
        form.reset();
        await updateCounters(token); 

        setTimeout(() => {
            window.location.href = 'file.html#download-section';
        }, 3000);

    } catch (error) {
        console.error("Erro:", error);
        statusDiv.innerHTML = `
            <div class="alert alert-danger mt-3">
                <strong>Erro!</strong> ${error.message}
            </div>`;
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}

async function pushFile() {
    const token = localStorage.getItem('token');
    const userDataJSON = localStorage.getItem('userData');
    
    const form = document.getElementById('uploadForm');
    const statusDiv = document.getElementById('uploadStatus');
    const btn = document.getElementById('submitBtn');

    await fetchRules();

    renderUserProfile(token, userDataJSON);
    updateCounters(token);

    if (!form) return;

    form.addEventListener('submit', (event) => {
        handleFileUpload(event, token, form, statusDiv, btn);
    });
}

let allFiles = [];
let token = '';

async function renderUserProfile(userDataJSON) {
    const nameEl = document.getElementById('display-name'); 
    
    if (!userDataJSON || !token) {
        alert("Faça login novamente.");
        window.location.href = "login.html";
        return null;
    }

    const userLocal = JSON.parse(userDataJSON); 
    try {
        const response = await fetch(`/usuarios/perfil/${userLocal.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erro user'); 
        
        const userAtualizado = await response.json(); 
        if(nameEl) nameEl.textContent = userAtualizado.nome;

    } catch (error) {
        console.error("Cache local usado:", error); 
        if (nameEl) nameEl.textContent = userLocal.nome;  
    }
    return userLocal; 
}

async function updateCounters() {
    try {
        const response = await fetch(`/arquivos/armazenados/quantidade/`, {
            headers: { 'Authorization': `Bearer ${token}`}
        }); 
        if (response.ok) {
            const data = await response.json(); 
            const storedEl = document.getElementById('storedFilesCount'); 
            if (storedEl) {
                storedEl.innerHTML = `<strong>${data.total}</strong> arquivos armazenados`;
            }
        }
    } catch (error) {
        console.error("Erro contador:", error); 
    }
}

async function fetchFiles() {
    const tbody = document.getElementById('filesTableBody');
    const errorMsg = document.getElementById('errorMessage');
    
    try {
        const response = await fetch(`/arquivos/armazenados/lista`, {
            headers: { 'Authorization': `Bearer ${token}`}
        });
        
        if (!response.ok) throw new Error('Falha ao buscar lista.');
        
        allFiles = await response.json();
        if (!Array.isArray(allFiles)) allFiles = [];

        updateCounters();
        renderTable(allFiles);            
        if(errorMsg) errorMsg.style.display = 'none';

    } catch (error) {
        console.error("Erro fetch:", error);
        if(tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Falha ao conectar no servidor.</td></tr>';
    }
}

const FILE_ICONS = {
    pdf: 'fa-file-pdf',
    docx: 'fa-file-word',
    jpg: 'fa-file-image',
    jpeg: 'fa-file-image',
    png: 'fa-file-image'
};

function renderTable(files) {
    const tbody = document.getElementById('filesTableBody');
    if(!tbody) return;

    tbody.innerHTML = '';
    if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum arquivo encontrado para este filtro.</td></tr>';
        return;
    }
    
    files.forEach(file => {
        const dataFormatada = new Date(file.data_upload).toLocaleDateString('pt-BR');
        const tr = document.createElement('tr');
        
        tr.id = `file-row-${file.id}`;

        const tipoReal = file.tipo_arquivo ? file.tipo_arquivo.toLowerCase() : '';
        const icon = FILE_ICONS[tipoReal] || 'fa-file';

        tr.innerHTML = `
            <td>
              <span class="file-name-cell">
                <span class="file-ext-badge file-ext-${tipoReal}"><i class="fas ${icon}"></i></span>
                ${file.nome_arquivo}
              </span>
            </td>
            <td>${dataFormatada}</td>
            <td>${file.descricao || '-'}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-primary me-1" onclick="window.downloadFile('${file.id}', '${file.nome_arquivo}')" title="Baixar Arquivo">
                <i class="bi bi-download"></i> Baixar
              </button>
              <button class="btn btn-sm btn-danger" onclick="window.deleteFile('${file.id}')" title="Excluir Arquivo">
                <i class="bi bi-trash"></i> Excluir
              </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterFiles = function() {
    const searchInput = document.getElementById('searchInput');
    const extFilter = document.getElementById('extFilter'); 

    const term = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedExt = extFilter ? extFilter.value.toLowerCase() : '';
    
    const filtered = allFiles.filter(file => {
        const matchesText = (file.nome_arquivo && file.nome_arquivo.toLowerCase().includes(term)) || 
                            (file.descricao && file.descricao.toLowerCase().includes(term));
        
        let matchesExt = true;
        if (selectedExt !== '') {
            const tipoReal = file.tipo_arquivo ? file.tipo_arquivo.toLowerCase() : ''; 
            matchesExt = (tipoReal === selectedExt);
        }

        return matchesText && matchesExt;
    });
    
    renderTable(filtered);
}

window.downloadFile = async function(id, nomeOrigional) {
    try {
        console.log(`Iniciando download do ID: ${id}`);
        const response = await fetch(`/arquivos/download/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });            
        
        if (!response.ok) {
            const erro = await response.json(); 
            alert(`Erro: ${erro.error || 'Falha no download'}`);
            return; 
        }
        
        const blob = await response.blob(); 
        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement('a');
        a.href = url; 
        a.download = nomeOrigional; 
        document.body.appendChild(a); 
        a.click(); 

        window.URL.revokeObjectURL(url); 
        document.body.removeChild(a); 

    } catch (e) {
        console.error(e);
        alert("Não foi possível baixar o arquivo.");
    }
};

window.deleteFile = async function(id) {
    const confirmDelete = confirm("Tem certeza que deseja excluir este arquivo permanentemente? Esta ação não pode ser desfeita.");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`/arquivos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            alert("Sua sessão expirou. Por favor, faça login novamente.");
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const erroData = await response.json();
                throw new Error(erroData.error || 'Falha ao deletar o arquivo.');
            } else {
                const textoErro = await response.text();
                console.error("Resposta não-JSON do servidor:", textoErro);
                throw new Error(`Erro no servidor (${response.status}): Rota não encontrada ou erro interno.`);
            }
        }

        const rowElement = document.getElementById(`file-row-${id}`);
        if (rowElement) {
            rowElement.style.transition = "opacity 0.3s ease";
            rowElement.style.opacity = "0";
            setTimeout(() => rowElement.remove(), 300);
        }

        allFiles = allFiles.filter(file => String(file.id) !== String(id));

        updateCounters();

        console.log(`Arquivo ID ${id} deletado com sucesso.`);

    } catch (error) {
        console.error("Erro ao deletar arquivo:", error);
        alert(`Não foi possível deletar o arquivo: ${error.message}`);
    }
}

async function pullFile() {
    token = localStorage.getItem('token');
    const userDataJSON = localStorage.getItem('userData');
    
    const user = await renderUserProfile(userDataJSON);
    if (user) {
        await fetchFiles();
    }
}

export async function file() {
    pushFile();
    pullFile();
}