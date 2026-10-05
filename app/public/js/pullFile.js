let allFiles = [];
let token = '';

async function renderUserProfile(userDataJSON) {
    if (!userDataJSON || !token) return null;
    
    const userLocal = JSON.parse(userDataJSON);
    const nameEl = document.getElementById('display-name');

    try {
        const response = await fetch(`/usuarios/perfil/${userLocal.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Erro ao buscar dados no servidor'); 
        
        const userAtualizado = await response.json(); 
        if(nameEl) nameEl.textContent = userAtualizado.nome;
        
    } catch (error) {
        console.error("Erro no backend, usando cache local: ", error); 
        if (nameEl) nameEl.textContent = userLocal.nome;  
    }
    
    return userLocal;
}

async function updateCounters() {
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

function popularFiltroCategorias(files) {
    const select = document.getElementById('categoriaFilter');
    if (!select) return;

    const valorAtual = select.value;
    const categoriasUnicas = [...new Set(files.map((f) => f.categoria).filter(Boolean))].sort();

    select.innerHTML = '<option value="">categorias</option>';
    categoriasUnicas.forEach((categoria) => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        select.appendChild(option);
    });

    // Preserva o filtro que o usuário já tinha escolhido, se ele ainda existir
    if (categoriasUnicas.includes(valorAtual)) {
        select.value = valorAtual;
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
        popularFiltroCategorias(allFiles);
        renderTable(allFiles);            
        if(errorMsg) errorMsg.style.display = 'none';

    } catch (error) {
        console.error("Erro fetch:", error);
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Falha ao conectar no servidor.</td></tr>';
    }
}

const FILE_ICONS = {
    pdf: 'fa-file-pdf',
    docx: 'fa-file-word',
    jpg: 'fa-file-image',
    jpeg: 'fa-file-image',
    png: 'fa-file-image'
};

function montarNomeComExtensao(nome, tipo) {
    const extensao = `.${tipo}`.toLowerCase();
    return nome.toLowerCase().endsWith(extensao) ? nome : `${nome}${extensao}`;
}

function categoriaBadgeClass(categoria) {
    return categoria === 'Migração' ? 'text-bg-warning' : 'text-bg-info';
}

function renderTable(files) {
    const tbody = document.getElementById('filesTableBody');
    if(!tbody) return;

    tbody.innerHTML = '';
    if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum arquivo encontrado para este filtro.</td></tr>';
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
            <td><span class="badge ${categoriaBadgeClass(file.categoria)}">${file.categoria || '-'}</span></td>
            <td class="text-center">
            <button class="btn btn-icon-action btn-icon-primary" onclick="window.downloadFile('${file.id}', '${montarNomeComExtensao(file.nome_arquivo, tipoReal)}')" title="Baixar arquivo">
                <i class="bi bi-download"></i>
            </button>
            <button class="btn btn-icon-action btn-icon-danger" onclick="window.deleteFile('${file.id}')" title="Excluir arquivo">
                <i class="bi bi-trash"></i>
            </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterFiles = function() {
    const searchInput = document.getElementById('searchInput');
    const extFilter = document.getElementById('extFilter'); 
    const categoriaFilter = document.getElementById('categoriaFilter');

    const term = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedExt = extFilter ? extFilter.value.toLowerCase() : '';
    const selectedCategoria = categoriaFilter ? categoriaFilter.value : '';
    
    const filtered = allFiles.filter(file => {
        const matchesText = (file.nome_arquivo && file.nome_arquivo.toLowerCase().includes(term)) || 
                            (file.descricao && file.descricao.toLowerCase().includes(term));
        
        let matchesExt = true;
        if (selectedExt !== '') {
            const tipoReal = file.tipo_arquivo ? file.tipo_arquivo.toLowerCase() : ''; 
            matchesExt = (tipoReal === selectedExt);
        }

        let matchesCategoria = true;
        if (selectedCategoria !== '') {
            matchesCategoria = file.categoria === selectedCategoria;
        }

        return matchesText && matchesExt && matchesCategoria;
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

export async function pullFile() {
    token = localStorage.getItem('token');
    const userDataJSON = localStorage.getItem('userData');
    
    const user = await renderUserProfile(userDataJSON);
    if (user) {
        await fetchFiles();
    }

    window.addEventListener('filepriv:arquivo-enviado', () => {
        fetchFiles();
    });
}