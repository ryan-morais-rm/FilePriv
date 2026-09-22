import prisma from '../config/db.js';
import { CATEGORIA_ARQUIVO_MIGRACAO } from '../constants/categorias.js';

const fileModel = {
    async criarArquivoPendente(usuario_id, nome_arquivo, descricao, tipo_arquivo, categoria) {
        return await prisma.arquivo.create({
            data: {
                nome_arquivo,
                descricao,
                tipo_arquivo,
                status: 'PENDENTE',
                categoria,
                usuario: { connect: { id: Number(usuario_id) } }
            }
        });
    },

    async confirmarArquivo(arquivo_id, { chave_referencia, servidor_id, nome_remoto, tamanho, hash }) {
        return await prisma.arquivo.update({
            where: { id: arquivo_id },
            data: { status: 'CONCLUIDO', chave_referencia, servidor_id, nome_remoto, tamanho, hash }
        });
    },

    async marcarArquivoComoErro(arquivo_id) {
        return await prisma.arquivo.update({
            where: { id: arquivo_id },
            data: { status: 'ERRO' }
        });
    },

    async marcarArquivoComoExcluindo(arquivo_id) {
        return await prisma.arquivo.update({
            where: { id: arquivo_id },
            data: { status: 'EXCLUINDO' }
        });
    },

    async reverterParaConcluido(arquivo_id) {
        return await prisma.arquivo.update({
            where: { id: arquivo_id },
            data: { status: 'CONCLUIDO' }
        }).catch(() => {});
    },

    async listarServidoresComContagem() {
        const servidores = await prisma.servidor.findMany({
            where: { status: 'ATIVO' },
            include: { _count: { select: { arquivos: true } } }
        });

        return servidores.map((s) => ({
            id: s.id,
            host: s.host,
            porta: s.porta,
            arquivos_armazenados: s._count.arquivos
        }));
    },

    async buscarServidorPorId(id) {
        return await prisma.servidor.findUnique({ where: { id } });
    },

    async findFileByIdAndUser(fileId, userId) {
        return await prisma.arquivo.findFirst({
            where: { id: parseInt(fileId), usuario_id: parseInt(userId) }
        });
    },

    async deleteFileRecord(fileId) {
        return await prisma.arquivo.delete({ where: { id: parseInt(fileId) } });
    },

    async buscarPorId(id) {
        return await prisma.arquivo.findUnique({ where: { id } });
    },

    // T5 — filtro opcional por categoria, sem quebrar quem já chama sem o parâmetro
    async listarPorUsuario(usuario_id, categoria = null) {
        return await prisma.arquivo.findMany({
            where: {
                usuario_id,
                status: 'CONCLUIDO',
                ...(categoria ? { categoria } : {})
            },
            orderBy: { data_upload: 'desc' }
        });
    },

    async contarArquivos(usuario_id) {
        return await prisma.arquivo.count({
            where: { usuario_id, status: 'CONCLUIDO' }
        });
    },

    async contarUploadsHoje(usuario_id) {
        const inicioDoDia = new Date();
        inicioDoDia.setHours(0, 0, 0, 0);

        return await prisma.arquivo.count({
            where: {
                usuario_id: Number(usuario_id),
                status: 'CONCLUIDO',
                data_upload: { gte: inicioDoDia }
            }
        });
    },

    async registrarEventoExclusao(usuario_id) {
        return await prisma.eventoExclusao.create({
            data: { usuario_id: Number(usuario_id) }
        });
    },

    async contarExclusoesRecentes(usuario_id, dias = 7) {
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);

        return await prisma.eventoExclusao.count({
            where: { usuario_id: Number(usuario_id), criado_em: { gte: desde } }
        });
    },

    // T4 — dispara a migração de categoria quando o usuário troca de perfil.
    // Só toca em arquivos CONCLUIDO; um PENDENTE/ERRO ainda não tem
    // categoria "definitiva" em uso real, e um EXCLUINDO está prestes a
    // sumir — mexer nele é trabalho inútil e pode colidir com o
    // reverterParaConcluido se a exclusão falhar no meio do caminho.
    async migrarCategoriasParaMigracao(usuario_id, categoriasValidasNoNovoPerfil) {
        return await prisma.arquivo.updateMany({
            where: {
                usuario_id: Number(usuario_id),
                status: 'CONCLUIDO',
                categoria: { notIn: categoriasValidasNoNovoPerfil }
            },
            data: { categoria: CATEGORIA_ARQUIVO_MIGRACAO }
        });
    }
};

export default fileModel;