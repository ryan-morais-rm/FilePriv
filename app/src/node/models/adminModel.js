import prisma from '../config/db.js';

const adminModel = {
    gerarEnderecosHostSubnet24(subnet) {
        const partes = subnet.split('/');
        if (partes.length !== 2 || partes[1] !== '24') return null;

        const octetos = partes[0].split('.').map(Number);
        if (octetos.length !== 4 || octetos.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
            return null;
        }

        const [a, b, c] = octetos;
        const enderecos = [];
        for (let ultimoOcteto = 1; ultimoOcteto <= 254; ultimoOcteto++) {
            enderecos.push(`${a}.${b}.${c}.${ultimoOcteto}`);
        }
        return enderecos;
    },

    async salvarConfiguracaoRede({ usuario_ssh, chave_privada, diretorio_remoto, porta_ssh }) {
        return await prisma.configuracaoRede.upsert({
            where: { id: 1 },
            update: { usuario_ssh, chave_privada, diretorio_remoto, porta_ssh },
            create: { id: 1, usuario_ssh, chave_privada, diretorio_remoto, porta_ssh }
        });
    },

    async popularServidores(enderecos, porta) {
        return await prisma.servidor.createMany({
            data: enderecos.map((host) => ({
                host,
                porta: Number(porta),
                status: 'ATIVO' // sem health check ainda — ver TODO no controller
            })),
            skipDuplicates: true
        });
    },

    async listarTodos() {
        return await prisma.servidor.findMany({
            select: { id: true, host: true, porta: true, status: true },
            orderBy: { host: 'asc' }
        });
    }
};

export default adminModel;