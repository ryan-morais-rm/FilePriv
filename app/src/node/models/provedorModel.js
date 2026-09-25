import prisma from '../config/db.js';

const provedorModel = {
    async buscarPorUsuarioETipo(usuario_id, tipo) {
        return await prisma.provedorExterno.findUnique({
            where: { usuario_id_tipo: { usuario_id: Number(usuario_id), tipo } }
        });
    },

    async buscarPorId(id) {
        return await prisma.provedorExterno.findUnique({ where: { id: Number(id) } });
    },

    async criarOuAtualizar(usuario_id, tipo, { bucket, regiao, credencial_referencia }) {
        return await prisma.provedorExterno.upsert({
            where: { usuario_id_tipo: { usuario_id: Number(usuario_id), tipo } },
            update: { bucket, regiao, credencial_referencia, status: 'CONECTADO' },
            create: { usuario_id: Number(usuario_id), tipo, bucket, regiao, credencial_referencia, status: 'CONECTADO' }
        });
    },

    async remover(usuario_id, tipo) {
        return await prisma.provedorExterno.delete({
            where: { usuario_id_tipo: { usuario_id: Number(usuario_id), tipo } }
        }).catch(() => null);
    },

    async contarArquivosVinculados(provedor_id) {
        return await prisma.arquivo.count({ where: { provedor_externo_id: provedor_id } });
    }
};

export default provedorModel;