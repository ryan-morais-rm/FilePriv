import authModel from '../models/authModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; 

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

            const token = jwt.sign(
                { id: usuario.id, email: usuario.email },
                process.env.JWT_SECRET,
                { expiresIn: '8h'}  
            );

            delete usuario.senha;
            console.log("Login autorizado para:", usuario.email);

            return res.status(200).json({
                usuario: usuario,
                token: token 
            });

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
    },
    async updateProfile(req, res) {
        try {
            const userId = req.usuarioId; 
            const { nome, email, senhaAtual, novaSenha } = req.body;

            const usuarioExistente = await authModel.buscarPorIdComSenha(userId);
            if (!usuarioExistente) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            const dadosParaAtualizar = { nome, email };

            if (novaSenha) {
                if (!senhaAtual) {
                    return res.status(400).json({ error: 'Para alterar a senha, você deve fornecer a senha atual.' });
                }

                const senhaValida = await bcrypt.compare(senhaAtual, usuarioExistente.senha);
                if (!senhaValida) {
                    return res.status(401).json({ error: 'A senha atual está incorreta.' });
                }

                const salt = await bcrypt.genSalt(10);
                dadosParaAtualizar.senha = await bcrypt.hash(novaSenha, salt);
            }

            const usuarioAtualizado = authModel.atualizarUsuario(userId, dadosParaAtualizar);

            return res.status(200).json({ 
                message: 'Perfil atualizado com sucesso!',
                usuario: usuarioAtualizado
            });

        } catch (error) {
            if (error.code === 'P2002') { 
                return res.status(409).json({ error: 'Este e-mail já está em uso por outra conta.' });
            }
            console.error("Erro ao atualizar perfil:", error);
            return res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
        }
    }
};

export default userController;