import provedorModel from '../models/provedorModel.js';
import { conectarProvedorS3 } from '../services/rustClient.js';

const provedorController = {
    async conectarS3(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const { bucket, access_key, secret_key, regiao } = req.body;

            if (!bucket || !access_key || !secret_key) {
                return res.status(400).json({ error: 'bucket, access_key e secret_key são obrigatórios.' });
            }

            const respostaRust = await conectarProvedorS3({
                bucket,
                accessKey: access_key,
                secretKey: secret_key,
                regiao: regiao || ''
            });

            if (!respostaRust.sucesso) {
                return res.status(422).json({ error: respostaRust.mensagem_erro || 'Falha ao conectar ao S3.' });
            }

            const provedor = await provedorModel.criarOuAtualizar(usuario_id, 'S3', {
                bucket,
                regiao: respostaRust.regiao_usada,
                credencial_referencia: respostaRust.credencial_referencia
            });

            return res.status(200).json({
                message: 'Provedor S3 conectado com sucesso!',
                provedor: {
                    tipo: provedor.tipo,
                    bucket: provedor.bucket,
                    regiao: provedor.regiao,
                    status: provedor.status
                }
            });
        } catch (error) {
            console.error('Erro ao conectar provedor S3:', error);
            return res.status(500).json({ error: 'Erro interno ao conectar provedor S3.' });
        }
    },

    // Sem ?confirmar=true, só devolve o aviso + contagem; a UI decide se
    // mostra o alerta de D4 antes de chamar de novo com a confirmação.
    async desconectarS3(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const confirmar = req.query.confirmar === 'true';

            const provedor = await provedorModel.buscarPorUsuarioETipo(usuario_id, 'S3');
            if (!provedor) {
                return res.status(404).json({ error: 'Nenhum provedor S3 conectado.' });
            }

            const totalArquivos = await provedorModel.contarArquivosVinculados(provedor.id);

            if (totalArquivos > 0 && !confirmar) {
                return res.status(409).json({
                    aviso: 'Se ainda existirem arquivos no S3, o FilePriv não poderá deletá-los ou realocá-los, deseja desconectar?',
                    arquivosVinculados: totalArquivos
                });
            }

            await provedorModel.remover(usuario_id, 'S3');

            return res.status(200).json({
                message: 'Provedor S3 desconectado.',
                arquivosVinculados: totalArquivos
            });
        } catch (error) {
            console.error('Erro ao desconectar provedor S3:', error);
            return res.status(500).json({ error: 'Erro interno ao desconectar provedor S3.' });
        }
    },

    async listarProvedores(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const provedorS3 = await provedorModel.buscarPorUsuarioETipo(usuario_id, 'S3');

            return res.status(200).json({
                s3: provedorS3
                    ? { conectado: true, bucket: provedorS3.bucket, regiao: provedorS3.regiao, status: provedorS3.status }
                    : { conectado: false }
            });
        } catch (error) {
            console.error('Erro ao listar provedores:', error);
            return res.status(500).json({ error: 'Erro ao buscar provedores.' });
        }
    }
};

export default provedorController;