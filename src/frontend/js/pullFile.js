export function pullFile() {
    // URLs da API do Backend (Node.js)
    const LIST_URL = 'http://localhost:3000/api/files/list/1'; // ID 1 fixo para teste
    const DOWNLOAD_URL = 'http://localhost:3000/api/files/download';

    let allFiles = [];
    
    // Inicializa a contagem de downloads lendo do localStorage
    let consultedCount = parseInt(localStorage.getItem('consultedCount')) || 0;

    async function fetchFiles() {
        const tbody = document.getElementById('filesTableBody');
        const errorMsg = document.getElementById('errorMessage');

        // Atualiza visualmente o contador de consultas ao carregar
        updateConsultedCounterUI();

        try {
            const response = await fetch(LIST_URL);
            
            if (!response.ok) throw new Error('Servidor não respondeu.');
            
            allFiles = await response.json();
            
            // O backend retorna um array. Se vier algo diferente, trata como vazio.
            if (!Array.isArray(allFiles)) allFiles = [];

            updateStoredCounterUI(allFiles.length);
            renderTable(allFiles);
            
            if(errorMsg) errorMsg.style.display = 'none';

        } catch (error) {
            console.error("Erro ao buscar arquivos:", error);
            if(tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Falha ao carregar dados.</td></tr>';
            
            if(errorMsg) {
                errorMsg.style.display = 'block';
                errorMsg.innerHTML = `
                    <strong>Erro de Conexão:</strong> Não foi possível conectar ao Backend.<br>
                    Certifique-se de que o comando <code>node app.js</code> está rodando na pasta <code>src/backend</code>.
                `;
            }
        }
    }

    function renderTable(files) {
        const tbody = document.getElementById('filesTableBody');
        if(!tbody) return;
        
        tbody.innerHTML = '';

        if (files.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Nenhum arquivo encontrado no banco de dados.</td></tr>';
            return;
        }

        files.forEach(file => {
            // Nota: O Controller já formata como { id, name, desc, date }
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${file.name}</td>
                <td>${file.date}</td>
                <td>${file.desc}</td>
                <td class="text-center">
                  <!-- Passamos o ID e o Nome para a função de download -->
                  <button class="btn btn-sm btn-primary" onclick="downloadFile('${file.id}', '${file.name}')">Download</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Atualiza contador de ARMAZENADOS (Baseado na resposta do Banco)
    function updateStoredCounterUI(count) {
        const counterEl = document.getElementById('storedFilesCount');
        if (counterEl) counterEl.innerHTML = `<strong>${count}</strong> arquivos armazenados`;
    }

    // Atualiza contador de CONSULTADOS (Baseado no LocalStorage)
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

    // Função de Download (Integração com Backend)
    async function downloadFile(id, filename) {
        try {
            // Incrementa contador local (Visual)
            consultedCount++;
            localStorage.setItem('consultedCount', consultedCount);
            updateConsultedCounterUI();

            // Chama o endpoint de download do Backend
            const res = await fetch(`${DOWNLOAD_URL}/${id}`);
            const data = await res.json();

            if (res.ok) {
                // Em um cenário real com blobs, aqui criaríamos um link <a> para baixar o binário.
                // Como é um protótipo retornando JSON:
                alert(`✅ Sucesso do Backend:\n${data.message}\nArquivo ID: ${data.fileData.id}`);
            } else {
                alert(`❌ Erro no download: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão ao tentar baixar o arquivo.");
        }
    }

    // EXPOR FUNÇÕES PARA O HTML
    // Necessário para que onclick="..." funcione com módulos
    window.filterFiles = filterFiles;
    window.downloadFile = downloadFile;

    // Inicialização
    fetchFiles();
}