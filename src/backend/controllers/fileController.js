import fileModel from '../models/fileModel.js';
import path from 'path';
import fs from 'fs'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkMagicBytes(filePath) {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    
    const hex = buffer.toString('hex').toUpperCase();

    if (hex.startsWith('25504446')) return 'pdf';
    if (hex.startsWith('FFD8FF')) return 'jpg';
    if (hex.startsWith('89504E470D0A1A0A')) return 'png';
    if (hex.startsWith('504B0304')) return 'docx'; 

    return null; 
}

const fileController = {
    async verifiyFile(req, res) {
        return res.status(200).json({
            maxSizeMB: 100,
            allowedExtensions: ['pdf', 'docx', 'jpg', 'jpeg', 'png']
        });
    },

    async uploadFile(req, res) {
        try {            
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            const MAX_SIZE = 100 * 1024 * 1024; 
            if (req.file.size > MAX_SIZE) {
                fs.unlinkSync(req.file.path); 
                return res.status(400).json({ error: 'Arquivo excede o limite de 100MB.' });
            }

            const fileType = checkMagicBytes(req.file.path);
            if (!fileType) {
                fs.unlinkSync(req.file.path);
                return res.status(415).json({ error: 'Tipo de arquivo inválido ou corrompido.' });
            }

            const usuario_id = req.usuarioId; 
            const { descricao, nome_customizado } = req.body;

            if (!usuario_id) {
                return res.status(400).json({ error: 'ID do usuário não fornecido.' });
            }

            const novoArquivo = await fileModel.registrarArquivo(
                usuario_id, 
                nome_customizado, 
                descricao, 
                req.file.path
            );

            return res.status(201).json({
                message: 'Arquivo enviado com sucesso!',
                arquivo: novoArquivo
            });

        } catch (error) {
            console.error("Erro no upload:", error);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({ error: 'Erro ao salvar arquivo.' });
        }
    },

    async filesStored(req, res) {
        try {
            const usuario_id  = req.usuarioId;
            if (!usuario_id) return res.status(400).json({error: 'ID necessário'});            
            const total = await fileModel.contarArquivos(Number(usuario_id));
           
            return res.status(200).json({ total: total }); 

        } catch (error) {
            console.error("Erro ao contar:", error); 
            return res.status(500).json({ error: 'Erro ao buscar contagem' }); 
        }
    },

    async listUserFiles(req, res) {
        try {
            const  usuario_id  = req.usuarioId;            
            const lista = await fileModel.listarPorUsuario(Number(usuario_id));
            
            return res.status(200).json(lista); 

        } catch (error) {
            console.error("Erro ao listar:", error); 
            return res.status(500).json({ error: 'Erro ao buscar arquivos' });
        }
    },

    async downloadFile(req, res) {
        try {
            const { id } = req.params;                  
            const arquivo = await fileModel.buscarPorId(Number(id));
            if (!arquivo) {
                return res.status(404).json({ error: 'Arquivo não encontrado no registro.' });
            }

            if (arquivo.usuario_id != req.usuarioId) {
                return res.status(403).json({
                    error: 'Acesso negado!'
                }); 
            }

            const apenasNome = path.basename(arquivo.caminho);            
            const caminhoAbsoluto = path.resolve(__dirname, '../uploads', apenasNome);
            
            if (!fs.existsSync(caminhoAbsoluto)) {
                if (fs.existsSync(arquivo.caminho)) {
                   return res.download(arquivo.caminho, arquivo.nome_arquivo);
                } else {
                    console.log("Arquivo físico sumiu:", caminhoAbsoluto);
                    return res.status(404).json({ error: 'Arquivo físico não encontrado.' });
                }
            }
            
            res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome_arquivo}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            
            const fileStream = fs.createReadStream(caminhoAbsoluto);
            fileStream.on('error', (err) => {
                console.error("Erro Stream:", err);
                if (!res.headersSent) res.status(500).end();
            });
            fileStream.pipe(res);

        } catch (error) {
            console.error("Erro download:", error);
            if (!res.headersSent) res.status(500).json({ error: 'Erro interno.' });
        }
    }
}; 

export default fileController;