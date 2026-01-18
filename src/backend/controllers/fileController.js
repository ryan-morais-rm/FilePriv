const db = require('../config/db');
const path = require('path'); 
const fs = require('fs');

const fileController = {
    async uploadFile(req, res) {
        try {
            console.log("Recebendo upload...");
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            const caminhoArquivo = req.file.path;
            const { usuario_id, descricao, nome_customizado } = req.body;
            if (!usuario_id) {
                return res.status(400).json({ error: 'ID do usuário não fornecido.' });
            }
            const query = `
                INSERT INTO arquivos (nome_arquivo, descricao, caminho, usuario_id) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *
            `;
            const values = [nome_customizado, descricao, caminhoArquivo, usuario_id];
            const resultado = await db.query(query, values);

            return res.status(201).json({
                message: 'Arquivo enviado com sucesso!',
                arquivo: resultado.rows[0]
            });

        } catch (error) {
            console.error("Erro no upload:", error);
            return res.status(500).json({ error: 'Erro ao salvar arquivo no banco.' });
        }
    },

    async filesStored(req, res) {
        try {
            const { usuario_id } = req.params; 
            if (!usuario_id) {
                return res.status(400).json({error: 'ID do usuário necessário'}); 
            }

            const query = 'SELECT COUNT(*) FROM arquivos WHERE usuario_id = $1'; 
            const values = [usuario_id]; 
            const resultado = await db.query(query, values); 
            const total = resultado.rows[0].count; 
            return res.status(200).json({ total: total }); 

        } catch (error) {
            console.error("Erro ao contar arquivos", error); 
            return res.status(500).json({ error: 'Erro ao buscar contagem' }); 
        }
    },

    async listUserFiles(req, res) {
        try {
            const { usuario_id } = req.params; 
            const query = 'SELECT * FROM arquivos WHERE usuario_id = $1 ORDER BY data_upload DESC'; 
            const values = [usuario_id]; 
            const resultado = await db.query(query, values); 
            
            return res.status(200).json(resultado.rows); 
            
        } catch (error) {
            console.error("Erro ao listar", error); 
            return res.status(500).json({ error: 'Erro ao buscar arquivos' });
        }
    },

    async downloadFile(req, res) {
        try {
            const { id } = req.params;            
            const query = 'SELECT * FROM arquivos WHERE id = $1';
            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Arquivo não encontrado no registro.' });
            }

            const arquivo = result.rows[0];
            const apenasNomeArquivo = path.basename(arquivo.caminho);
            const caminhoAbsoluto = path.join(__dirname, '../uploads', apenasNomeArquivo);

            if (!fs.existsSync(caminhoAbsoluto)) {
                console.log("Arquivo físico sumiu:", caminhoAbsoluto);
                return res.status(404).json({ error: 'Arquivo físico não encontrado.' });
            }

            console.log("Enviando via Stream:", caminhoAbsoluto);
            
            res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome_arquivo}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            const fileStream = fs.createReadStream(caminhoAbsoluto);
            fileStream.on('error', (err) => {
                console.error("Erro no Stream:", err);
                if (!res.headersSent) res.status(500).end();
            });
            fileStream.pipe(res);

        } catch (error) {
            console.error("Erro no controller:", error);
            if (!res.headersSent) res.status(500).json({ error: 'Erro interno.' });
        }
    }
}; 

module.exports = fileController;