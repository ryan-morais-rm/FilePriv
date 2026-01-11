const express = require('express');
const cors = require('cors');
const path = require('path');

// Importação das Rotas
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const serverRoutes = require('./routes/serverRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// MIDDLEWARES DE SEGURANÇA E LOG
// ==============================================

// 1. CORS: Permite qualquer origem (Para desenvolvimento)
// Garante que o navegador não bloqueie o Frontend
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Logger de Requisições (Para você ver o que está chegando)
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// 3. Parsers de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================================
// ROTAS
// ==============================================

app.get('/api/status', (req, res) => {
    res.json({ status: 'Online', message: 'Backend FilePriv OK!' });
});

// Montagem das rotas
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/servers', serverRoutes);

// ==============================================
// TRATAMENTO DE ERROS
// ==============================================

// 404 - Rota não encontrada (Isso ajuda a saber se errou o caminho)
app.use((req, res) => {
    console.log(`[404] Rota não encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Rota ${req.method} ${req.url} não encontrada.` });
});

// 500 - Erro interno
app.use((err, req, res, next) => {
    console.error('[500] Erro interno:', err.stack);
    res.status(500).json({ error: 'Erro interno no servidor' });
});

app.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📡 Pronto para receber requisições...\n`);
});

module.exports = app;