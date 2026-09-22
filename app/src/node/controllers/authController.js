import authModel from '../models/authModel.js';
import fileModel from '../models/fileModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CATEGORIAS_USUARIO, categoriasArquivoValidasParaPerfil } from '../constants/categorias.js';

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
            const { nome, email, senha, categoria_perfil } = req.body;
            if (!nome || !email || !senha || !categoria_perfil) {
                return res.status(400).json({ error: 'Nome, email, senha e categoria_perfil são obrigatórios' });
            }

            if (!CATEGORIAS_USUARIO.includes(categoria_perfil)) {
                return res.status(400).json({
                    error: `categoria_perfil inválida. Valores aceitos: ${CATEGORIAS_USUARIO.join(', ')}`
                });
            }

            const usuarioExistente = await authModel.buscarPorEmail(email);
            if (usuarioExistente) {
                return res.status(409).json({ error: 'Email já cadastrado' });
            }

            const senhaHash = await bcrypt.hash(senha, 10);
            const novoUsuario = await authModel.criarUsuario(nome, email, senhaHash, categoria_perfil);
            delete novoUsuario.senha;

            return res.status(201).json(novoUsuario);

        } catch (error) {
            console.error("Erro ao criar usuário:", error); 
            return res.status(500).json({ error: 'Erro ao cadastrar usuário' }); 
        }
    },

    async listarCategoriasPerfil(req, res) {
        return res.status(200).json({ categorias: CATEGORIAS_USUARIO });
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
            const { nome, email, senhaAtual, novaSenha, categoria_perfil } = req.body;
            if (nome !== undefined && nome.trim() === '') {
                return res.status(400).json({ error: 'Nome não pode ficar vazio.' });
            }
            if (email !== undefined && email.trim() === '') {
                return res.status(400).json({ error: 'Email não pode ficar vazio.' });
            }

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

            // T4 — troca de perfil, com migração de categorias de arquivo
            let migracaoAplicada = null;
            if (categoria_perfil && categoria_perfil !== usuarioExistente.categoria_perfil) {
                if (!CATEGORIAS_USUARIO.includes(categoria_perfil)) {
                    return res.status(400).json({
                        error: `categoria_perfil inválida. Valores aceitos: ${CATEGORIAS_USUARIO.join(', ')}`
                    });
                }

                const categoriasValidasNoNovoPerfil = categoriasArquivoValidasParaPerfil(categoria_perfil);

                // Migra os arquivos ANTES de confirmar a troca de perfil no
                // usuário — se a migração falhar, abortamos sem deixar o
                // usuário com um perfil novo e arquivos na categoria antiga
                // "invisíveis" pro seletor de upload.
                const resultado = await fileModel.migrarCategoriasParaMigracao(
                    userId, categoriasValidasNoNovoPerfil
                );
                migracaoAplicada = resultado.count;

                dadosParaAtualizar.categoria_perfil = categoria_perfil;
            }

            const usuarioAtualizado = await authModel.atualizarUsuario(userId, dadosParaAtualizar);

            return res.status(200).json({ 
                message: 'Perfil atualizado com sucesso!',
                usuario: usuarioAtualizado,
                ...(migracaoAplicada !== null
                    ? { arquivosMigrados: migracaoAplicada }
                    : {})
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