import prisma from '../config/db.js';

const fileModel = {
    async registrarArquivo(usuario_id, nome_customizado, descricao, caminhoArquivo) {
        const arquivo = await prisma.arquivo.create({
            data: {
                nome_arquivo: nome_customizado,
                descricao: descricao,
                caminho: caminhoArquivo,
                usuario_id: usuario_id 
            }
        });
        
        return arquivo;
    },

    async buscarPorId(id) {
        const arquivo = await prisma.arquivo.findUnique({
            where: {
                id: id
            }
        });
        
        return arquivo; 
    },

    async listarPorUsuario(usuario_id) {
        const arquivos = await prisma.arquivo.findMany({
            where: {
                usuario_id: usuario_id
            },
            orderBy: {
                data_upload: 'desc'
            }
        });

        return arquivos;
    }, 

    async contarArquivos(usuario_id) {
        const total = await prisma.arquivo.count({
            where: {
                usuario_id: usuario_id
            }
        });

        return total; 
    }
};

export default fileModel;