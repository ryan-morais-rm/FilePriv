const db = require('../config/db');
const bcrypt = require('bcryptjs');

const userController = {
    async loginUser(req, res) {
        console.log("1. Rota de login acessada!");

        try {
            const { email, senha } = req.body;
            console.log("2. Dados recebidos:", email); 

            const query = 'SELECT * FROM usuarios WHERE email = $1';
            const values = [email]; 

            console.log("3. Buscando usuário pelo email...");
            const resultado = await db.query(query, values); 

            if (resultado.rows.length === 0) {
                console.log("4. Email não existe no banco.");
                return res.status(401).json({message: 'Email ou senha incorretos'}); 
            }

            const usuario = resultado.rows[0];

            const senhaBate = await bcrypt.compare(senha, usuario.senha);

            if (!senhaBate) {
                console.log("5. Senha incorreta.");
                return res.status(401).json({message: 'Email ou senha incorretos'});
            }

            console.log("6. Sucesso! Login autorizado.");
            
            delete usuario.senha;
            
            return res.status(200).json(usuario);

        } catch (error) {
            console.log("7. ERRO ACONTECEU:", error);
            return res.status(500).json({ error: 'Erro ao logar usuário'}); 
        }
    },

    async consultUser(req, res) {
        try {
            const { nome, email } = req.query; 

            if (!nome || !email) {
                return res.status(400).json({ error: 'Favor informar nome e email na busca' });
            }
            const query = 'SELECT * FROM usuarios WHERE nome = $1 AND email = $2';
            const values = [nome, email];

            const resultado = await db.query(query, values);

            if (resultado.rows.length === 0) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            return res.status(200).json(resultado.rows);
        } catch (error) {
            console.error(error); 
            return res.status(500).json({ error: 'Erro ao buscar usuário' });
        }
    },
    
    async createUser(req, res) {
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
    }
};

module.exports = userController;