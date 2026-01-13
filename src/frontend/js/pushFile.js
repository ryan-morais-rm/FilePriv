export function pushFile() {
    const API_URL = 'http://localhost:3000/arquivos/upload'; 
    
    const form = document.getElementById('uploadForm');
    const statusDiv = document.getElementById('uploadStatus');
    const btn = document.getElementById('submitBtn');

    async function updateCounters() {
        const consultedCount = localStorage.getItem('consultedCount') || 0;
        const consultedEl = document.getElementById('consultedFilesCount');
        if (consultedEl) consultedEl.innerHTML = `<strong>${consultedCount}</strong> arquivos consultados`;

        try {
            // É preciso de uma rota GET aqui
            const response = await fetch('http://localhost:3000/arquivos'); 
            if (response.ok) {
                const files = await response.json();
                const storedEl = document.getElementById('storedFilesCount');
                if (storedEl) storedEl.innerHTML = `<strong>${files.length}</strong> arquivos armazenados`;
            }
        } catch (e) {
            console.error("Erro ao atualizar contadores (Backend offline?)", e);
        }
    }

    updateCounters();

    if (!form) return;

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); 

        const fileName = document.getElementById('fileName').value.trim(); 
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        const fileDesc = document.getElementById('fileDesc') ? document.getElementById('fileDesc').value : "";

        if (!file) {
            statusDiv.innerHTML = `<div class="alert alert-danger mt-3">Selecione um arquivo!</div>`;
            return;
        }

        const userData = localStorage.getItem('userData');
        if (!userData) {
            statusDiv.innerHTML = `<div class="alert alert-danger mt-3">Você precisa estar logado!</div>`;
            return;
        }
        const user = JSON.parse(userData);

        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Enviando...`;
        statusDiv.innerHTML = '';

        try {
            const formData = new FormData();
            formData.append('arquivo', file);
            formData.append('usuario_id', user.id);
            formData.append('descricao', fileDesc);
            formData.append('nome_customizado', fileName);

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Falha no envio');

            statusDiv.innerHTML = `<div class="alert alert-success mt-3">
                Arquivo enviado com sucesso!<br>
                Redirecionando...
            </div>`;
            
            form.reset();
            updateCounters();

            setTimeout(() => {
                window.location.href = 'pullFile.html';
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
    });
}