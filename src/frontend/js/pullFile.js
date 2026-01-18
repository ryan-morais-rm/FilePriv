export function pullFile() {
    let allFiles = [];
    const API_BASE = 'http://localhost:3000';

    async function renderUserProfile() {
        const nameEl = document.getElementById('display-name'); 
        const userDataJSON = localStorage.getItem('userData');
        if (!userDataJSON) {
            alert("Faça login novamente.");
            window.location.href = "login.html";
            return null;
        }
        const userLocal = JSON.parse(userDataJSON); 
        try {
            const response = await fetch(`${API_BASE}/usuarios/perfil/${userLocal.id}`);
            if (!response.ok) throw new Error('Erro user'); 
            const userAtualizado = await response.json(); 
            if(nameEl) nameEl.textContent = userAtualizado.nome;

        } catch (error) {
            console.error("Cache local usado:", error); 
            if (nameEl) nameEl.textContent = userLocal.nome;  
        }
        return userLocal; 
    }

    async function fetchFiles(user) {
        const tbody = document.getElementById('filesTableBody');
        const errorMsg = document.getElementById('errorMessage');
        try {
            const response = await fetch(`${API_BASE}/arquivos/armazenados/lista/${user.id}`);            
            if (!response.ok) throw new Error('Falha ao buscar lista.');
            allFiles = await response.json();
            if (!Array.isArray(allFiles)) allFiles = [];
            updateCounters(user.id);
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
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum arquivo encontrado.</td></tr>';
            return;
        }
        files.forEach(file => {
            // Formata a data (Postgres manda ISO String)
            const dataFormatada = new Date(file.data_upload).toLocaleDateString('pt-BR');
            const tr = document.createElement('tr');
            // IMPORTANTE: Aqui usamos os nomes exatos das colunas do Postgres
            // nome_arquivo, descricao, data_upload, id
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

    async function updateCounters(userId) {
        try {
            const response = await fetch(`${API_BASE}/arquivos/armazenados/quantidade/${userId}`); 
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

    window.filterFiles = function() {
        const searchInput = document.getElementById('searchInput');
        if(!searchInput) return;

        const term = searchInput.value.toLowerCase();
        
        const filtered = allFiles.filter(file => 
            (file.nome_arquivo && file.nome_arquivo.toLowerCase().includes(term)) || 
            (file.descricao && file.descricao.toLowerCase().includes(term))
        );
        renderTable(filtered);
    }

    window.downloadFile = async function(id, nomeOrigional) {
        try {
            console.log(`Iniciando download do ID: ${id}`);
            
            const response = await fetch(`${API_BASE}/arquivos/download/${id}`);
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

    (async () => {
        const user = await renderUserProfile();
        if (user) {
            fetchFiles(user);
        }
    })();
}