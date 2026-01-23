import fileModel from '../models/fileModel.js';
import path from 'path';
import fs from 'fs'; 
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileController = {
    
    async uploadFile(req, res) {
        try {            
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            const { usuario_id, descricao, nome_customizado } = req.body;

            if (!usuario_id) {
                return res.status(400).json({ error: 'ID do usuário não fornecido.' });
            }

            const idConvertido = parseInt(usuario_id);

            const novoArquivo = await fileModel.registrarArquivo(
                idConvertido, 
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
            return res.status(500).json({ error: 'Erro ao salvar arquivo.' });
        }
    },

    async filesStored(req, res) {
        try {
            const { usuario_id } = req.params;
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
            const { usuario_id } = req.params;            
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

            const apenasNome = path.basename(arquivo.caminho);            
            const caminhoAbsoluto = path.resolve(__dirname, '../uploads', apenasNome);
            if (!fs.existsSync(caminhoAbsoluto)) {
                if (fs.existsSync(arquivo.caminho)) {
                   // Usa o caminho direto do banco se o construído falhar
                   return res.download(arquivo.caminho, arquivo.nome_arquivo);
                } else {
                    console.log("Arquivo físico sumiu:", caminhoAbsoluto);
                    return res.status(404).json({ error: 'Arquivo físico não encontrado.' });
                }
            }
            
            console.log("Enviando:", caminhoAbsoluto);
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