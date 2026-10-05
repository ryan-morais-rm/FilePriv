import provedorModel from '../models/provedorModel.js';
import fileModel from '../models/fileModel.js';
import jwt from 'jsonwebtoken';
import { conectarProvedorS3, conectarProvedorDrive } from '../services/rustClient.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

async function metricasDoProvedor(provedor) {
    if (!provedor) return { conectado: false, stored: 0, deleted: 0, today: 0 };

    const [stored, deleted, today] = await Promise.all([
        fileModel.contarArquivosPorProvedor(provedor.id),
        fileModel.contarExclusoesRecentesPorProvedor(provedor.id),
        fileModel.contarUploadsHojePorProvedor(provedor.id)
    ]);

    return { conectado: true, stored, deleted, today };
}

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
            const [provedorS3, provedorDrive] = await Promise.all([
                provedorModel.buscarPorUsuarioETipo(usuario_id, 'S3'),
                provedorModel.buscarPorUsuarioETipo(usuario_id, 'DRIVE')
            ]);

            return res.status(200).json({
                s3: provedorS3
                    ? { conectado: true, bucket: provedorS3.bucket, regiao: provedorS3.regiao, status: provedorS3.status }
                    : { conectado: false },
                drive: provedorDrive
                    ? { conectado: true, status: provedorDrive.status }
                    : { conectado: false }
            });
        } catch (error) {
            console.error('Erro ao listar provedores:', error);
            return res.status(500).json({ error: 'Erro ao buscar provedores.' });
        }
    },
    
    async metricasProvedores(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const [provedorS3, provedorDrive] = await Promise.all([
                provedorModel.buscarPorUsuarioETipo(usuario_id, 'S3'),
                provedorModel.buscarPorUsuarioETipo(usuario_id, 'DRIVE')
            ]);

            const [metricasS3, metricasDrive] = await Promise.all([
                metricasDoProvedor(provedorS3),
                metricasDoProvedor(provedorDrive)
            ]);

            return res.status(200).json({
                s3: { ...metricasS3, bucket: provedorS3?.bucket },
                drive: metricasDrive
            });
        } catch (error) {
            console.error('Erro ao buscar métricas de provedores:', error);
            return res.status(500).json({ error: 'Erro ao buscar métricas de provedores.' });
        }
    },
    
    async iniciarConexaoDrive(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const state = jwt.sign({ usuario_id }, process.env.JWT_SECRET, { expiresIn: '10m' });

            const params = new URLSearchParams({
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
                redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
                response_type: 'code',
                scope: GOOGLE_DRIVE_SCOPE,
                access_type: 'offline',
                prompt: 'consent', // garante refresh_token mesmo numa reconexão
                state
            });

            return res.status(200).json({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` });
        } catch (error) {
            console.error('Erro ao iniciar conexão com o Drive:', error);
            return res.status(500).json({ error: 'Erro ao iniciar conexão com o Google Drive.' });
        }
    },

    // Pública — o navegador chega aqui redirecionado pelo Google, sem JWT no header.
    async driveCallback(req, res) {
        const { code, state, error: erroGoogle } = req.query;

        if (erroGoogle) {
            return res.redirect(`/html/homepage.html?drive_erro=${encodeURIComponent(erroGoogle)}`);
        }

        let usuario_id;
        try {
            ({ usuario_id } = jwt.verify(state, process.env.JWT_SECRET));
        } catch {
            return res.redirect('/html/homepage.html?drive_erro=state_invalido');
        }

        try {
            const respostaRust = await conectarProvedorDrive({
                code,
                redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI
            });

            if (!respostaRust.sucesso) {
                console.error('Falha ao conectar Drive:', respostaRust.mensagem_erro);
                return res.redirect('/html/homepage.html?drive_erro=falha_conexao');
            }

            await provedorModel.criarOuAtualizar(usuario_id, 'DRIVE', {
                pasta_raiz_id: respostaRust.pasta_raiz_id,
                credencial_referencia: respostaRust.credencial_referencia
            });

            return res.redirect('/html/homepage.html?drive_conectado=true');
        } catch (error) {
            console.error('Erro no callback do Drive:', error);
            return res.redirect('/html/homepage.html?drive_erro=interno');
        }
    },

    async desconectarDrive(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const confirmar = req.query.confirmar === 'true';

            const provedor = await provedorModel.buscarPorUsuarioETipo(usuario_id, 'DRIVE');
            if (!provedor) {
                return res.status(404).json({ error: 'Nenhum provedor Drive conectado.' });
            }

            const totalArquivos = await provedorModel.contarArquivosVinculados(provedor.id);
            if (totalArquivos > 0 && !confirmar) {
                return res.status(409).json({
                    aviso: 'Se ainda existirem arquivos no Drive, o FilePriv não poderá deletá-los ou realocá-los, deseja desconectar?',
                    arquivosVinculados: totalArquivos
                });
            }

            await provedorModel.remover(usuario_id, 'DRIVE');
            return res.status(200).json({ message: 'Provedor Drive desconectado.', arquivosVinculados: totalArquivos });
        } catch (error) {
            console.error('Erro ao desconectar provedor Drive:', error);
            return res.status(500).json({ error: 'Erro interno ao desconectar provedor Drive.' });
        }
    }
};

export default provedorController;