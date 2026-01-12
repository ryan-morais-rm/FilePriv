const express = require('express');
const cors = require('cors'); 
const authRoutes = require('../backend/routes/authRoutes');

const app = express();

app.use(cors());

app.use(express.json());

app.use('/usuarios', authRoutes);

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000 com estrutura organizada');
});