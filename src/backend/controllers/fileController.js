const fileModel = require('../models/fileModel');
const path = require('path'); 
const fs = require('fs');

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
            return res.status(500).json({ error: 'Erro ao salvar arquivo.' });
        }
    },

    async filesStored(req, res) {
        try {
            const { usuario_id } = req.params;
            if (!usuario_id) return res.status(400).json({error: 'ID necessário'});
            const total = await fileModel.contarArquivos(usuario_id);
           
            return res.status(200).json({ total: total }); 

        } catch (error) {
            console.error("Erro ao contar:", error); 
            return res.status(500).json({ error: 'Erro ao buscar contagem' }); 
        }
    },

    async listUserFiles(req, res) {
        try {
            const { usuario_id } = req.params;
            const lista = await fileModel.listarPorUsuario(usuario_id);
            
            return res.status(200).json(lista); 

        } catch (error) {
            console.error("Erro ao listar:", error); 
            return res.status(500).json({ error: 'Erro ao buscar arquivos' });
        }
    },

    async downloadFile(req, res) {
        try {
            const { id } = req.params;            
            const arquivo = await fileModel.buscarPorId(id);
            if (!arquivo) {
                return res.status(404).json({ error: 'Arquivo não encontrado no registro.' });
            }

            const apenasNome = path.basename(arquivo.caminho);
            const caminhoAbsoluto = path.join(__dirname, '../uploads', apenasNome);
            if (!fs.existsSync(caminhoAbsoluto)) {
                console.log("Arquivo físico sumiu:", caminhoAbsoluto);
                return res.status(404).json({ error: 'Arquivo físico não encontrado.' });
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

module.exports = fileController;