import fileModel from '../models/fileModel.js';
import adminModel from '../models/adminModel.js';
import authModel from '../models/authModel.js';
import provedorModel from '../models/provedorModel.js';
import { processarArquivo, baixarArquivo, excluirArquivo } from '../services/rustClient.js';
import { categoriasArquivoValidasParaPerfil } from '../constants/categorias.js';

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

function montarDestinoVm(servidor, configuracaoRede) {
    return {
        vm: {
            host: servidor.host,
            porta: servidor.porta,
            usuario_ssh: configuracaoRede.usuario_ssh,
            chave_privada_referencia: configuracaoRede.chave_privada_referencia,
            diretorio_remoto: configuracaoRede.diretorio_remoto
        }
    };
}

function montarDestinoS3Externo(provedor) {
    return {
        s3_externo: {
            bucket: provedor.bucket,
            credencial_referencia: provedor.credencial_referencia,
            regiao: provedor.regiao
        }
    };
}

const fileController = {
    async verifiyFile(req, res) {
        return res.status(200).json({
            maxSizeMB: 100,
            allowedExtensions: ALLOWED_TYPES
        });
    },
    
    async listarCategoriasArquivo(req, res) {
        try {
            const usuario = await authModel.buscarPorId(req.usuarioId);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            const categorias = categoriasArquivoValidasParaPerfil(usuario.categoria_perfil);
            return res.status(200).json({ categorias });
        } catch (error) {
            console.error('Erro ao listar categorias de arquivo:', error);
            return res.status(500).json({ error: 'Erro ao buscar categorias.' });
        }
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
            const { descricao, nome_customizado, categoria, destino } = req.body;
            const destinoEscolhido = destino === 'meu_s3' ? 'meu_s3' : 'distribuido';

            if (!usuario_id) {
                return res.status(400).json({ error: 'ID do usuário não fornecido.' });
            }

            if (!categoria) {
                return res.status(400).json({ error: 'categoria é obrigatória.' });
            }

            const usuario = await authModel.buscarPorId(usuario_id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }

            const categoriasValidas = categoriasArquivoValidasParaPerfil(usuario.categoria_perfil);
            if (!categoriasValidas.includes(categoria)) {
                return res.status(400).json({
                    error: `categoria inválida para o seu perfil. Valores aceitos: ${categoriasValidas.join(', ')}`
                });
            }

            arquivoPendente = await fileModel.criarArquivoPendente(
                usuario_id, nome_customizado, descricao, fileType, categoria
            );

            let destinoRpc;
            let provedorUsadoId = null;

            if (destinoEscolhido === 'meu_s3') {
                const provedor = await provedorModel.buscarPorUsuarioETipo(usuario_id, 'S3');
                if (!provedor) {
                    await fileModel.marcarArquivoComoErro(arquivoPendente.id);
                    return res.status(400).json({ error: 'Você ainda não conectou um provedor S3.' });
                }

                destinoRpc = montarDestinoS3Externo(provedor);
                provedorUsadoId = provedor.id;

            } else {
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

                destinoRpc = {
                    vm: {
                        servidores_disponiveis: servidoresDisponiveis,
                        usuario_ssh: configuracaoRede.usuario_ssh,
                        chave_privada_referencia: configuracaoRede.chave_privada_referencia,
                        diretorio_remoto: configuracaoRede.diretorio_remoto
                    }
                };
            }

            let respostaRust;
            try {
                respostaRust = await processarArquivo({
                    usuarioId: usuario_id,
                    nomeArquivo: nome_customizado,
                    tipoArquivo: fileType,
                    buffer: req.file.buffer,
                    destino: destinoRpc
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
                servidor_id: respostaRust.armazenado_em_provedor_externo ? null : respostaRust.servidor_id,
                provedor_externo_id: respostaRust.armazenado_em_provedor_externo ? provedorUsadoId : null,
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
            if (!arquivo.nome_remoto || !arquivo.chave_referencia) {
                return res.status(500).json({ error: 'Metadados do arquivo incompletos — não é possível localizar o arquivo.' });
            }

            let destino;

            if (arquivo.provedor_externo_id) {
                const provedor = await provedorModel.buscarPorId(arquivo.provedor_externo_id);
                if (!provedor) {
                    return res.status(500).json({ error: 'Provedor externo do arquivo não encontrado.' });
                }
                destino = montarDestinoS3Externo(provedor);

            } else if (arquivo.servidor_id) {
                const servidor = await fileModel.buscarServidorPorId(arquivo.servidor_id);
                if (!servidor) {
                    return res.status(500).json({ error: 'Servidor de armazenamento não encontrado.' });
                }
                const configuracaoRede = await adminModel.buscarConfiguracaoRede();
                if (!configuracaoRede) {
                    return res.status(503).json({ error: 'Configuração de rede não cadastrada pelo administrador.' });
                }
                destino = montarDestinoVm(servidor, configuracaoRede);

            } else {
                return res.status(500).json({ error: 'Arquivo sem destino de armazenamento válido.' });
            }

            function montarNomeComExtensao(nome, tipo) {
                const extensao = `.${tipo}`.toLowerCase();
                return nome.toLowerCase().endsWith(extensao) ? nome : `${nome}${extensao}`;
            }

            const streamRust = baixarArquivo({
                nomeRemoto: arquivo.nome_remoto,
                chaveReferencia: arquivo.chave_referencia,
                destino
            });

            let respondeuErro = false;

            streamRust.on('data', (mensagem) => {
                if (!res.headersSent) {
                    const nomeArquivo = montarNomeComExtensao(arquivo.nome_arquivo, arquivo.tipo_arquivo);
                    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
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

            if (!arquivo.nome_remoto || (!arquivo.servidor_id && !arquivo.provedor_externo_id)) {
                await fileModel.deleteFileRecord(arquivo.id);
                return res.status(200).json({ message: 'Registro removido (arquivo nunca chegou a ser armazenado).' });
            }

            await fileModel.marcarArquivoComoExcluindo(arquivo.id);

            let destino;

            if (arquivo.provedor_externo_id) {
                const provedor = await provedorModel.buscarPorId(arquivo.provedor_externo_id);
                if (!provedor) {
                    await fileModel.reverterParaConcluido(arquivo.id);
                    return res.status(500).json({ error: 'Provedor externo do arquivo não encontrado.' });
                }
                destino = montarDestinoS3Externo(provedor);

            } else {
                const servidor = await fileModel.buscarServidorPorId(arquivo.servidor_id);
                const configuracaoRede = await adminModel.buscarConfiguracaoRede();

                if (!servidor || !configuracaoRede) {
                    await fileModel.reverterParaConcluido(arquivo.id);
                    return res.status(500).json({ error: 'Não foi possível localizar o servidor ou a configuração de rede.' });
                }
                destino = montarDestinoVm(servidor, configuracaoRede);
            }

            let respostaRust;
            try {
                respostaRust = await excluirArquivo({
                    nomeRemoto: arquivo.nome_remoto,
                    chaveReferencia: arquivo.chave_referencia || '',
                    destino
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
            const { categoria } = req.query;
            const lista = await fileModel.listarPorUsuario(Number(usuario_id), categoria || null);
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