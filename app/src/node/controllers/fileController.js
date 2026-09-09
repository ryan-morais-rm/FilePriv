import fileModel from '../models/fileModel.js';
import adminModel from '../models/adminModel.js';
import { processarArquivo, baixarArquivo, excluirArquivo } from '../services/rustClient.js';

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['pdf', 'docx', 'jpg', 'jpeg', 'png'];

function checkMagicBytes(buffer) {
    const hex = buffer.subarray(0, 8).toString('hex').toUpperCase();

    if (hex.startsWith('25504446')) return 'pdf';
    if (hex.startsWith('FFD8FF')) return 'jpg';
    if (hex.startsWith('89504E470D0A1A0A')) return 'png';
    if (hex.startsWith('504B0304')) return 'docx';

    return null;
}

const fileController = {
    async verifiyFile(req, res) {
        return res.status(200).json({
            maxSizeMB: 100,
            allowedExtensions: ALLOWED_TYPES
        });
    },

    async uploadFile(req, res) {
        let arquivoPendente = null;

        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            if (req.file.size > MAX_SIZE) {
                return res.status(400).json({ error: 'Arquivo excede o limite de 100MB.' });
            }

            const fileType = checkMagicBytes(req.file.buffer);
            if (!fileType) {
                return res.status(415).json({ error: 'Tipo de arquivo inválido ou corrompido.' });
            }

            const usuario_id = req.usuarioId;
            const { descricao, nome_customizado } = req.body;

            if (!usuario_id) {
                return res.status(400).json({ error: 'ID do usuário não fornecido.' });
            }

            arquivoPendente = await fileModel.criarArquivoPendente(
                usuario_id, nome_customizado, descricao, fileType
            );

            const servidoresDisponiveis = await fileModel.listarServidoresComContagem();

            if (servidoresDisponiveis.length === 0) {
                await fileModel.marcarArquivoComoErro(arquivoPendente.id);
                return res.status(503).json({ error: 'Nenhum servidor de armazenamento disponível no momento.' });
            }

            const configuracaoRede = await adminModel.buscarConfiguracaoRede();

            if (!configuracaoRede) {
                await fileModel.marcarArquivoComoErro(arquivoPendente.id);
                return res.status(503).json({ error: 'Configuração de rede ainda não cadastrada pelo administrador.' });
            }

            let respostaRust;
            try {
                respostaRust = await processarArquivo({
                    usuarioId: usuario_id,
                    nomeArquivo: nome_customizado,
                    tipoArquivo: fileType,
                    buffer: req.file.buffer,
                    servidoresDisponiveis,
                    usuarioSsh: configuracaoRede.usuario_ssh,
                    chavePrivada: configuracaoRede.chave_privada,
                    diretorioRemoto: configuracaoRede.diretorio_remoto
                });
            } catch (grpcError) {
                console.error('Rust indisponível ou falhou na chamada gRPC:', grpcError);
                await fileModel.marcarArquivoComoErro(arquivoPendente.id);
                return res.status(502).json({ error: 'Serviço de processamento (Rust) indisponível no momento.' });
            }

            if (!respostaRust.sucesso) {
                await fileModel.marcarArquivoComoErro(arquivoPendente.id);
                return res.status(422).json({ error: respostaRust.mensagem_erro || 'Falha ao processar o arquivo.' });
            }

            const arquivoFinal = await fileModel.confirmarArquivo(arquivoPendente.id, {
                chave_referencia: respostaRust.chave_referencia,
                servidor_id: respostaRust.servidor_id,
                nome_remoto: respostaRust.nome_remoto,
                tamanho: respostaRust.tamanho,
                hash: respostaRust.hash
            });

            return res.status(201).json({
                message: 'Arquivo enviado com sucesso!',
                arquivo: arquivoFinal
            });

        } catch (error) {
            console.error("Erro no upload:", error);
            if (arquivoPendente) {
                await fileModel.marcarArquivoComoErro(arquivoPendente.id).catch(() => {});
            }
            return res.status(500).json({ error: 'Erro ao processar o arquivo.' });
        }
    },

    async downloadFile(req, res) {
        try {
            const { id } = req.params;
            const usuario_id = req.usuarioId;

            const arquivo = await fileModel.buscarPorId(Number(id));
            if (!arquivo) {
                return res.status(404).json({ error: 'Arquivo não encontrado.' });
            }
            if (arquivo.usuario_id !== usuario_id) {
                return res.status(403).json({ error: 'Acesso negado.' });
            }
            if (arquivo.status !== 'CONCLUIDO') {
                return res.status(409).json({ error: 'Arquivo ainda não está disponível para download.' });
            }
            if (!arquivo.servidor_id || !arquivo.nome_remoto || !arquivo.chave_referencia) {
                return res.status(500).json({ error: 'Metadados do arquivo incompletos — não é possível localizar o arquivo.' });
            }

            const servidor = await fileModel.buscarServidorPorId(arquivo.servidor_id);
            if (!servidor) {
                return res.status(500).json({ error: 'Servidor de armazenamento não encontrado.' });
            }

            const configuracaoRede = await adminModel.buscarConfiguracaoRede();
            if (!configuracaoRede) {
                return res.status(503).json({ error: 'Configuração de rede não cadastrada pelo administrador.' });
            }

            const streamRust = baixarArquivo({
                host: servidor.host,
                porta: servidor.porta,
                usuarioSsh: configuracaoRede.usuario_ssh,
                chavePrivada: configuracaoRede.chave_privada,
                diretorioRemoto: configuracaoRede.diretorio_remoto,
                nomeRemoto: arquivo.nome_remoto,
                chaveReferencia: arquivo.chave_referencia
            });

            let respondeuErro = false;

            streamRust.on('data', (mensagem) => {
                if (!res.headersSent) {
                    res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome_arquivo}"`);
                    res.setHeader('Content-Type', 'application/octet-stream');
                }
                if (mensagem.pedaco && mensagem.pedaco.length > 0) {
                    res.write(mensagem.pedaco);
                }
            });

            streamRust.on('end', () => {
                if (!respondeuErro) res.end();
            });

            streamRust.on('error', (err) => {
                console.error('Erro no streaming de download do Rust:', err);
                respondeuErro = true;
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Falha ao buscar o arquivo no servidor de armazenamento.' });
                } else {
                    res.end();
                }
            });

        } catch (error) {
            console.error('Erro no download:', error);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Erro interno ao processar o download.' });
            }
            res.end();
        }
    },

    async deleteFile(req, res) {
        const { id } = req.params;
        const usuario_id = req.usuarioId;

        try {
            const arquivo = await fileModel.findFileByIdAndUser(id, usuario_id);
            if (!arquivo) {
                return res.status(404).json({
                    error: 'Arquivo não encontrado ou você não tem permissão para excluí-lo.'
                });
            }

            if (arquivo.status === 'EXCLUINDO') {
                return res.status(409).json({ error: 'Este arquivo já está em processo de exclusão.' });
            }

            if (!arquivo.servidor_id || !arquivo.nome_remoto) {
                // Nunca chegou a ser gravado de verdade em nenhum servidor —
                // não há nada remoto pra apagar, só o registro local.
                await fileModel.deleteFileRecord(arquivo.id);
                return res.status(200).json({ message: 'Registro removido (arquivo nunca chegou a ser armazenado).' });
            }

            await fileModel.marcarArquivoComoExcluindo(arquivo.id);

            const servidor = await fileModel.buscarServidorPorId(arquivo.servidor_id);
            const configuracaoRede = await adminModel.buscarConfiguracaoRede();

            if (!servidor || !configuracaoRede) {
                await fileModel.reverterParaConcluido(arquivo.id);
                return res.status(500).json({ error: 'Não foi possível localizar o servidor ou a configuração de rede.' });
            }

            let respostaRust;
            try {
                respostaRust = await excluirArquivo({
                    host: servidor.host,
                    porta: servidor.porta,
                    usuarioSsh: configuracaoRede.usuario_ssh,
                    chavePrivada: configuracaoRede.chave_privada,
                    diretorioRemoto: configuracaoRede.diretorio_remoto,
                    nomeRemoto: arquivo.nome_remoto,
                    chaveReferencia: arquivo.chave_referencia || ''
                });
            } catch (grpcError) {
                console.error('Rust indisponível ao excluir:', grpcError);
                await fileModel.reverterParaConcluido(arquivo.id);
                return res.status(502).json({ error: 'Serviço de processamento (Rust) indisponível no momento.' });
            }

            if (!respostaRust.sucesso) {
                await fileModel.reverterParaConcluido(arquivo.id);
                return res.status(422).json({ error: respostaRust.mensagem_erro || 'Falha ao excluir o arquivo.' });
            }

            await fileModel.deleteFileRecord(arquivo.id);
            await fileModel.registrarEventoExclusao(usuario_id);

            return res.status(200).json({ message: 'Arquivo excluído com sucesso.' });

        } catch (error) {
            console.error('Erro na exclusão:', error);
            await fileModel.reverterParaConcluido(Number(id)).catch(() => {});
            return res.status(500).json({ error: 'Erro interno ao tentar excluir o arquivo.' });
        }
    },

    async filesStored(req, res) {
        try {
            const usuario_id = req.usuarioId;
            if (!usuario_id) return res.status(400).json({ error: 'ID necessário' });
            const total = await fileModel.contarArquivos(Number(usuario_id));
            return res.status(200).json({ total });
        } catch (error) {
            console.error("Erro ao contar:", error);
            return res.status(500).json({ error: 'Erro ao buscar contagem' });
        }
    },

    async listUserFiles(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const lista = await fileModel.listarPorUsuario(Number(usuario_id));
            return res.status(200).json(lista);
        } catch (error) {
            console.error("Erro ao listar:", error);
            return res.status(500).json({ error: 'Erro ao buscar arquivos' });
        }
    },

    async metricas(req, res) {
        try {
            const usuario_id = req.usuarioId;
            const [armazenados, excluidos7dias, uploadsHoje] = await Promise.all([
                fileModel.contarArquivos(usuario_id),
                fileModel.contarExclusoesRecentes(usuario_id),
                fileModel.contarUploadsHoje(usuario_id)
            ]);

            return res.status(200).json({ armazenados, excluidos7dias, uploadsHoje });
        } catch (error) {
            console.error('Erro ao buscar métricas:', error);
            return res.status(500).json({ error: 'Erro ao buscar métricas.' });
        }
    }
};

export default fileController;