const db = require('../config/db');
const bcrypt = require('bcryptjs');

const authModel = {
    async criarUsuario(req, res) {
        try {
            const { nome, email, senha } = req.body;
            if (!nome || !email || !senha) {
                return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
            }

            const query = 'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *';
            const senhaCriptografada = await bcrypt.hash(senha, 10);
            const values = [nome, email, senhaCriptografada];
            const resultado = await db.query(query, values);

            return res.status(201).json(resultado.rows[0]);

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
        }
    }, 

    async consultarUsuario(req, res) {
        try {
            const { id } = req.params; 
            if (!id) {
                return res.status(400).json({ error: 'ID do usuário é obrigatório' });
            }

            const query = 'SELECT id, nome, email FROM usuarios WHERE id = $1';
            const values = [id];
            const resultado = await db.query(query, values);

            if (resultado.rows.length === 0) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }
            return res.status(200).json(resultado.rows[0]);
            
        } catch (error) {
            console.error("Erro ao buscar perfil:", error); 
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }, 

    async validarAcesso(req, res) {
        try {
            const { email, senha } = req.body; 
            const query = 'SELECT * FROM usuarios WHERE email = $1';
            const values = [email];
            const resultado = await db.query(query, values);

            const usuario = resultado.rows[0];
            if (!usuario) {
                return res.status(401).json({ message: 'Email ou senha incorretos' });
            }

            const senhaBate = await bcrypt.compare(senha, usuario.senha);
            if (!senhaBate) {
                return res.status(401).json({ message: 'Email ou senha incorretos' });
            }

            console.log("Login autorizado.");
            delete usuario.senha;

            return res.status(200).json(usuario);

        } catch (error) {
            console.error("Erro no login:", error); 
            return res.status(500).json({ error: 'Erro interno ao realizar login' }); 
        }
    }
}; 

module.exports = authModel; 