export function pushFile() {
    const API_URL = 'http://localhost:3000/api/files/upload'';
    const form = document.getElementById('uploadForm');
    const statusDiv = document.getElementById('uploadStatus');
    const btn = document.getElementById('submitBtn');

    // --- FUNÇÃO PARA ATUALIZAR OS CONTADORES NA NAVBAR ---
    async function updateCounters() {
        // 1. Arquivos Consultados (Lê do LocalStorage)
        const consultedCount = localStorage.getItem('consultedCount') || 0;
        const consultedEl = document.getElementById('consultedFilesCount');
        if (consultedEl) {
            consultedEl.innerHTML = `<strong>${consultedCount}</strong> arquivos consultados`;
        }

        // 2. Arquivos Armazenados (Busca do JSON Server)
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                const files = await response.json();
                const storedEl = document.getElementById('storedFilesCount');
                if (storedEl) {
                    storedEl.innerHTML = `<strong>${files.length}</strong> arquivos armazenados`;
                }
            }
        } catch (e) {
            console.error("Erro ao atualizar contadores:", e);
        }
    }

    // Inicializa os contadores ao carregar a página
    updateCounters();

    // Verificação de segurança para o formulário
    if (!form) return;

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); 

        const fileName = document.getElementById('fileName').value.trim();
        const fileDesc = document.getElementById('fileDesc').value.trim();

        if (!fileName) {
            statusDiv.innerHTML = `<div class="alert alert-danger mt-3">Por favor, insira um nome para o arquivo.</div>`;
            return;
        }

        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...`;
        statusDiv.innerHTML = '';

        try {
            const today = new Date();
            const dateString = today.toLocaleDateString('pt-BR');

            const newFile = {
                name: fileName,
                desc: fileDesc || "Sem descrição",
                date: dateString
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFile)
            });

            if (!response.ok) throw new Error('Falha na conexão com o servidor local');

            // Atualiza o contador de arquivos armazenados imediatamente após o sucesso
            updateCounters();

            // SUCESSO
            statusDiv.innerHTML = `<div class="alert alert-success mt-3">
                Arquivo <strong>${fileName}</strong> registrado com sucesso!<br>
                Aguarde, redirecionando em 5 segundos...
            </div>`;
            
            form.reset();

            // AUMENTADO PARA 5 SEGUNDOS (5000ms)
            setTimeout(() => {
                window.location.href = 'pullFile.html';
            }, 5000);

        } catch (error) {
            console.error("Erro:", error);
            statusDiv.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <strong>Erro de Conexão!</strong><br>
                    Não foi possível salvar no <code>db.json</code>.
                </div>`;
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    });
}