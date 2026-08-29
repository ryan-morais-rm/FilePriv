import fileModel from '../models/fileModel.js';
import { processarArquivo } from '../services/rustClient.js';

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

            // Registrado já como PENDENTE — se o processo cair no meio,
            // fica visível no banco em vez de sumir sem rastro.
            arquivoPendente = await fileModel.criarArquivoPendente(
                usuario_id, nome_customizado, descricao, fileType
            );

            const servidoresDisponiveis = await fileModel.listarServidoresComContagem();

            if (servidoresDisponiveis.length === 0) {
                await fileModel.marcarArquivoComoErro(arquivoPendente.id);
                return res.status(503).json({ error: 'Nenhum servidor de armazenamento disponível no momento.' });
            }

            let respostaRust;
            try {
                respostaRust = await processarArquivo({
                    usuarioId: usuario_id,
                    nomeArquivo: nome_customizado,
                    tipoArquivo: fileType,
                    buffer: req.file.buffer,
                    servidoresDisponiveis
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

    // TODO (próxima etapa): pedir ao Rust os bytes reconstruídos/descriptografados
    // e repassar via stream ao cliente. Por ora, resposta explícita em vez de
    // quebrar com erro (o campo "caminho" não existe mais no schema).
    async downloadFile(req, res) {
        return res.status(501).json({ error: 'Download ainda não adaptado ao novo pipeline (Rust).' });
    },

    // TODO (próxima etapa): pedir ao Rust que limpe as partes nas VMs + a chave
    // no S3, esperar confirmação, e só então apagar do Prisma.
    async deleteFile(req, res) {
        return res.status(501).json({ error: 'Exclusão ainda não adaptada ao novo pipeline (Rust).' });
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
    }
};

export default fileController;