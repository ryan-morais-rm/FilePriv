const express = require('express');
const cors = require('cors');
const path = require('path');

// Importação das Rotas (O "Cardápio")
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const serverRoutes = require('./routes/serverRoutes');

// Inicialização do App Express
const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// MIDDLEWARES (Configurações Globais)
// ==============================================

// Habilita CORS para permitir que o Frontend (que pode estar em outra porta) acesse a API
app.use(cors());

// Habilita o parse de JSON no corpo das requisições (req.body)
app.use(express.json());

// Habilita o parse de dados de formulário (urlencoded)
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (opcional, caso queira servir o frontend pelo mesmo servidor)
// app.use(express.static(path.join(__dirname, '../frontend')));

// ==============================================
// ROTAS DA API
// ==============================================

// Rota de Teste (Health Check)
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'Online', 
        message: 'FilePriv Backend está rodando! 🚀',
        timestamp: new Date()
    });
});

// Definição dos Endpoints Principais
app.use('/api/auth', authRoutes);      // Rotas de Login/Cadastro
app.use('/api/files', fileRoutes);     // Rotas de Upload/Download
app.use('/api/servers', serverRoutes); // Rotas de Monitoramento de Servidores

// ==============================================
// TRATAMENTO DE ERROS (404 e 500)
// ==============================================

// Rota não encontrada (404)
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint não encontrado.' });
});

// Tratamento global de erros (500)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

// ==============================================
// INICIALIZAÇÃO DO SERVIDOR
// ==============================================

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`✅ Servidor FilePriv rodando na porta ${PORT}`);
    console.log(`🔗 Acesso local: http://localhost:${PORT}`);
    console.log(`📂 API Status:   http://localhost:${PORT}/api/status`);
    console.log(`==================================================\n`);
});

module.exports = app; // Exporta para testes se necessário