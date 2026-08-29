import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import path from 'path'; 
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRouter from './routes/authRoutes.js';
import fileRouter from './routes/fileRoutes.js';
import adminRouter from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const privateKey = fs.readFileSync(path.join(__dirname, 'https_pem', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'https_pem', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
const PORT = 443

const httpsServer = https.createServer(credentials, app);

app.use(cors({
    origin: ['https://localhost', 'https://127.0.0.1'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use('/usuarios', authRouter);
app.use('/arquivos', fileRouter);
app.use('/admin', adminRouter);

app.use(express.static(path.join(__dirname, '../public/')));

httpsServer.listen(PORT, () => {
    console.log(`API Node.js rodando em https://localhost:${PORT}`);
});