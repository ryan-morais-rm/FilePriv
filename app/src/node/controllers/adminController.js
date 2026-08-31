import jwt from 'jsonwebtoken';
import adminModel from '../models/adminModel.js';
import { verificarServidores } from '../services/rustClient.js';

const adminController = {
    async login(req, res) {
        const { usuario, senha } = req.body;

        const credenciaisValidas =
            usuario === process.env.ADMIN_USERNAME && senha === process.env.ADMIN_PASSWORD;

        if (!credenciaisValidas) {
            return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
        }

        const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '2h' });
        return res.status(200).json({ token });
    },

    /// Varre a sub-rede via o Rust ANTES de gravar qualquer linha — só
    /// entra no banco quem foi detectado (ATIVO ou ERRO); quem não
    /// respondeu nunca vira registro.
    async popularSubnet(req, res) {
        try {
            const { subnet, porta, usuario_ssh, chave_privada, diretorio_remoto } = req.body;

            if (!subnet || !porta || !usuario_ssh || !chave_privada || !diretorio_remoto) {
                return res.status(400).json({
                    error: 'subnet, porta, usuario_ssh, chave_privada e diretorio_remoto são obrigatórios.'
                });
            }

            const enderecos = adminModel.gerarEnderecosHostSubnet24(subnet);
            if (!enderecos) {
                return res.status(400).json({ error: 'Sub-rede inválida. Use o formato "10.0.0.0/24".' });
            }

            await adminModel.salvarConfiguracaoRede({
                usuario_ssh, chave_privada, diretorio_remoto, porta_ssh: Number(porta)
            });

            const respostaVerificacao = await verificarServidores({
                servidores: enderecos.map((host) => ({ host, porta: Number(porta) })),
                usuarioSsh: usuario_ssh,
                chavePrivada: chave_privada,
                diretorioRemoto: diretorio_remoto
            });

            const resultado = await adminModel.popularServidoresDetectados(
                respostaVerificacao.resultados, porta
            );

            const ativos = respostaVerificacao.resultados.filter((r) => r.status === 'ATIVO').length;
            const comErro = respostaVerificacao.resultados.filter((r) => r.status === 'ERRO').length;
            const semResposta = respostaVerificacao.resultados.length - ativos - comErro;

            return res.status(201).json({
                message: `Varredura de ${subnet} concluída: ${ativos} ativo(s), ${comErro} com erro, ${semResposta} sem resposta (não cadastrados). ${resultado.count} servidor(es) novo(s) gravado(s).`,
                total: resultado.count
            });
        } catch (error) {
            console.error('Erro ao popular servidores:', error);
            return res.status(500).json({ error: 'Erro ao popular servidores a partir da sub-rede.' });
        }
    },

    async listarServidores(req, res) {
        try {
            const servidores = await adminModel.listarTodos();
            return res.status(200).json(servidores);
        } catch (error) {
            console.error('Erro ao listar servidores:', error);
            return res.status(500).json({ error: 'Erro ao listar servidores.' });
        }
    }
};

export default adminController;