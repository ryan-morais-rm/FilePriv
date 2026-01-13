const db = require('../config/db');

const fileController = {
    async uploadFile(req, res) {
        try {
            console.log("Recebendo upload...");
            
            // 1. Verifica o arquivo físico (está em req.file)
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            // O caminho onde o multer salvou o arquivo
            const caminhoArquivo = req.file.path;

            const { usuario_id, descricao, nome_customizado } = req.body;

            if (!usuario_id) {
                return res.status(400).json({ error: 'ID do usuário não fornecido.' });
            }

            // 3. Salva no banco (Adicionei o $4 que faltava)
            const query = `
                INSERT INTO arquivos (nome_arquivo, descricao, caminho, usuario_id) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *
            `;
            
            // A ordem aqui tem que bater com a ordem do INSERT acima
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
    }
}; 

module.exports = fileController;