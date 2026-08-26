import prisma from '../config/db.js'; 

const authModel = {
    async criarUsuario(nome, email, senhaHash) {
        const usuario = await prisma.usuario.create({
            data: {
                nome: nome,
                email: email,
                senha: senhaHash
            }
        });
        return usuario;
    },

    async atualizarUsuario(id, dadosAtualizados) {
        return await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: dadosAtualizados,
            select: {
                id: true,
                nome: true,
                email: true
            }
        });
    }, 

    async buscarPorId(id) {
        const usuario = await prisma.usuario.findUnique({
            where: { 
                id: parseInt(id) 
            },
            select: { 
                id: true,
                nome: true,
                email: true
            }
        });
        return usuario;
    }, 

    async buscarPorEmail(email) {
        const usuario = await prisma.usuario.findUnique({
            where: { 
                email: email 
            }
        });
        return usuario;
    },

    async buscarPorIdComSenha(id) {
        return await prisma.usuario.findUnique({
            where: { id: parseInt(id) }
        });
    },
}; 

export default authModel;