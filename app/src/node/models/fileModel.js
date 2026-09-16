import prisma from '../config/db.js';

const fileModel = {
    async criarArquivoPendente(usuario_id, nome_arquivo, descricao, tipo_arquivo) {
        return await prisma.arquivo.create({
            data: {
                nome_arquivo,
                descricao,
                tipo_arquivo,
                status: 'PENDENTE',
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

    /// Usado quando a exclusão falha depois de já termos marcado
    /// EXCLUINDO — devolve o registro pro estado anterior em vez de
    /// deixá-lo preso.
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

    async listarPorUsuario(usuario_id) {
        return await prisma.arquivo.findMany({
            where: { usuario_id, status: 'CONCLUIDO' },
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
    }
};

export default fileModel;