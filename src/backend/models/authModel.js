import prisma from '../config/db.js'; 

const authModel = {
    async criarUsuario(nome, email, senhaHash) {
        // O Prisma faz o INSERT e o RETURNING automaticamente
        const usuario = await prisma.usuario.create({
            data: {
                nome: nome,
                email: email,
                senha: senhaHash
            }
        });
        return usuario;
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
    }
}; 

export default authModel;