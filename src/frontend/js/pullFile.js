export function pullFile() {
    const API_URL = 'http://localhost:3000/api/files/list/1';
    let allFiles = [];
    
    // Inicializa a contagem de downloads lendo do localStorage
    let consultedCount = parseInt(localStorage.getItem('consultedCount')) || 0;

    async function fetchFiles() {
        const tbody = document.getElementById('filesTableBody');
        const errorMsg = document.getElementById('errorMessage');

        // Atualiza visualmente os contadores ao carregar
        updateConsultedCounterUI();

        try {
            // REQUISIÇÃO GET PARA O JSON SERVER
            const response = await fetch(API_URL);
            
            if (!response.ok) throw new Error('Servidor não respondeu.');
            
            allFiles = await response.json();
            
            // Ordena por ID decrescente (mais recente primeiro)
            allFiles.reverse(); 

            updateStoredCounterUI(allFiles.length);
            renderTable(allFiles);
            if(errorMsg) errorMsg.style.display = 'none';

        } catch (error) {
            console.error("Erro ao buscar arquivos:", error);
            if(tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Falha ao carregar dados.</td></tr>';
            if(errorMsg) {
                errorMsg.style.display = 'block';
                errorMsg.innerHTML = `
                    <strong>Atenção:</strong> Não foi possível conectar ao banco de dados local.<br>
                    Certifique-se de rodar o comando: <code>json-server --watch db.json</code> no terminal.
                `;
            }
        }
    }

    function renderTable(files) {
        const tbody = document.getElementById('filesTableBody');
        if(!tbody) return;
        
        tbody.innerHTML = '';

        if (files.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum arquivo encontrado no banco.</td></tr>';
            return;
        }

        files.forEach(file => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${file.name}</td>
                <td>${file.date}</td>
                <td>${file.desc}</td>
                <td class="text-center">
                  <button class="btn btn-sm btn-primary" onclick="downloadFile('${file.name}')">Download</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Atualiza contador de ARMAZENADOS (Vem do Banco de Dados)
    function updateStoredCounterUI(count) {
        const counterEl = document.getElementById('storedFilesCount');
        if (counterEl) counterEl.innerHTML = `<strong>${count}</strong> arquivos armazenados`;
    }

    // Atualiza contador de CONSULTADOS (Vem do LocalStorage)
    function updateConsultedCounterUI() {
        const counterEl = document.getElementById('consultedFilesCount');
        if (counterEl) counterEl.innerHTML = `<strong>${consultedCount}</strong> arquivos consultados`;
    }

    // Função de filtro (Exposta globalmente)
    function filterFiles() {
        const searchInput = document.getElementById('searchInput');
        if(!searchInput) return;

        const term = searchInput.value.toLowerCase();
        const filtered = allFiles.filter(file => 
            (file.name && file.name.toLowerCase().includes(term)) || 
            (file.desc && file.desc.toLowerCase().includes(term)) ||
            (file.date && file.date.includes(term))
        );
        renderTable(filtered);
    }

    // Função de Download (Exposta globalmente)
    function downloadFile(filename) {
        // Incrementa contador local
        consultedCount++;
        localStorage.setItem('consultedCount', consultedCount);
        updateConsultedCounterUI();

        alert(`Simulando download do servidor local: ${filename}\n(Contador de consultas atualizado!)`);
    }

    // EXPOR FUNÇÕES PARA O HTML
    window.filterFiles = filterFiles;
    window.downloadFile = downloadFile;

    // Inicialização
    fetchFiles();
}