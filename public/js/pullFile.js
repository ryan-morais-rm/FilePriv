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

        tr.innerHTML = `
            <td>${file.nome_arquivo}</td>
            <td>${dataFormatada}</td>
            <td>${file.descricao || '-'}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-primary" onclick="window.downloadFile('${file.id}', '${file.nome_arquivo}')">
                <i class="bi bi-download"></i> Baixar
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

export async function pullFile() {
    token = localStorage.getItem('token');
    const userDataJSON = localStorage.getItem('userData');
    
    const user = await renderUserProfile(userDataJSON);
    if (user) {
        await fetchFiles();
    }
}