import jwt from 'jsonwebtoken';
import adminModel from '../models/adminModel.js';

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

    // TODO (próximo passo): depois que isso estiver validado, o Rust ainda
    // não sabe nada sobre essa configuração — ele continua lendo
    // servidores.rs hardcoded. Falta estender o .proto (ServidorCandidato)
    // e o rustClient.js pra levar usuario_ssh/chave_privada/diretorio_remoto
    // junto de cada upload.
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

            const resultado = await adminModel.popularServidores(enderecos, porta);

            return res.status(201).json({
                message: `${resultado.count} servidores novos cadastrados a partir de ${subnet} (${enderecos.length - resultado.count} já existiam e foram ignorados).`,
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