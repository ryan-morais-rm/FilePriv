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
}

export async function pushFile() {
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