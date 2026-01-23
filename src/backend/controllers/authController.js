import authModel from '../models/authModel.js';
import bcrypt from 'bcryptjs';

const userController = {
    
    async loginUser(req, res) {
        try { 
            const { email, senha } = req.body;
            const usuario = await authModel.buscarPorEmail(email);
            if (!usuario) {
                return res.status(401).json({ message: 'Email ou senha incorretos' });
            }

            const senhaBate = await bcrypt.compare(senha, usuario.senha);
            if (!senhaBate) {
                return res.status(401).json({ message: 'Email ou senha incorretos' });
            }

            delete usuario.senha;
            console.log("Login autorizado para:", usuario.email);

            return res.status(200).json(usuario);

        } catch (error) {
            console.error("Erro no login:", error);
            return res.status(500).json({ error: 'Erro interno ao realizar login' }); 
        }
    },
    
    async createUser(req, res) {
        try {
            const { nome, email, senha } = req.body;
            if (!nome || !email || !senha) {
                return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
            }

            const usuarioExistente = await authModel.buscarPorEmail(email);
            if (usuarioExistente) {
                return res.status(409).json({ error: 'Email já cadastrado' });
            }

            const senhaHash = await bcrypt.hash(senha, 10);
            const novoUsuario = await authModel.criarUsuario(nome, email, senhaHash);
            delete novoUsuario.senha;

            return res.status(201).json(novoUsuario);

        } catch (error) {
            console.error("Erro ao criar usuário:", error); 
            return res.status(500).json({ error: 'Erro ao cadastrar usuário' }); 
        }
    },

    async consultUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'ID obrigatório' });
            }

            const usuario = await authModel.buscarPorId(id);
            if (!usuario) {
                return res.status(404).json({ message: 'Usuário não encontrado' });
            }

            return res.status(200).json(usuario);
            
        } catch (error) {
            console.error("Erro na consulta:", error); 
            return res.status(500).json({ error: 'Erro ao consultar usuário' }); 
        }
    }
};

export default userController;