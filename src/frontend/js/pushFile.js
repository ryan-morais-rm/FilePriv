export function pushFile() {
    const API_URL = 'http://localhost:3000'; 

    const form = document.getElementById('uploadForm');
    const statusDiv = document.getElementById('uploadStatus');
    const btn = document.getElementById('submitBtn');
    const token = localStorage.getItem('token');

    async function renderUserProfile() {
        const nameEl = document.getElementById('display-name'); 
        const userDataJSON = localStorage.getItem('userData');
        if (!userDataJSON || !token) return;
        const userLocal = JSON.parse(userDataJSON); 

        try {
            const response = await fetch(`${API_URL}/usuarios/perfil/${userLocal.id}`, {
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

    async function updateCounters() {
        if (!token) return;
        
        try {
            const response = await fetch(`${API_URL}/arquivos/armazenados/quantidade`, {
                headers: { 'Authorization': `Bearer ${token}`}
            })
             
            if (response.ok) {
                const data = await response.json(); 
                const storedEl = document.getElementById('storedFilesCount'); 
                if (storedEl) {
                    storedEl.innerHTML = `<strong>${data.total}</strong> arquivos armazenados`;
                }
            }
        } catch (error) {
            console.error("Erro ao buscar contagem:", e); 
        }
    }

    renderUserProfile();
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
            formData.append('descricao', fileDesc);
            formData.append('nome_customizado', fileName);

            const response = await fetch(`${API_URL}/arquivos/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
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