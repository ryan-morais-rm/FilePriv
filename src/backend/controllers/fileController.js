const db = require('../config/db');

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
    }
}; 

module.exports = fileController;