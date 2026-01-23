import db from '../config/db.js';

const fileModel = {
    async registrarArquivo(usuario_id, nome_customizado, descricao, caminhoArquivo) {
        const query = `
            INSERT INTO arquivos (nome_arquivo, descricao, caminho, usuario_id) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const values = [nome_customizado, descricao, caminhoArquivo, usuario_id];
        const resultado = await db.query(query, values);
        
        return resultado.rows[0];
    },

    async buscarPorId(id) {
        const query = 'SELECT * FROM arquivos WHERE id = $1';
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) {
            return null; 
        }

        return result.rows[0];
    },

    async listarPorUsuario(usuario_id) {
        const query = 'SELECT * FROM arquivos WHERE usuario_id = $1 ORDER BY data_upload DESC'; 
        const resultado = await db.query(query, [usuario_id]); 

        return resultado.rows; 
    }, 

    async contarArquivos(usuario_id) {
        const query = 'SELECT COUNT(*) FROM arquivos WHERE usuario_id = $1'; 
        const resultado = await db.query(query, [usuario_id]);

        return resultado.rows[0].count; 
    }
};

export default fileModel;