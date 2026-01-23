import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/authRoutes.js';
import fileRouter from './routes/fileRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use('/usuarios', authRouter);
app.use('/arquivos', fileRouter);

app.get('/', (req, res) => {
    res.send('Servidor ativo');
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`Teste com ES Modules (import/export)`);
});