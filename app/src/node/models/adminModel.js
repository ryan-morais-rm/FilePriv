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

    /// Só grava no banco os hosts que o Rust confirmou (ATIVO ou ERRO) —
    /// quem não respondeu (SEM_RESPOSTA) nunca vira registro.
    async popularServidoresDetectados(resultados, porta) {
        const detectados = resultados.filter((r) => r.status !== 'SEM_RESPOSTA');
        if (detectados.length === 0) {
            return { count: 0 };
        }

        return await prisma.servidor.createMany({
            data: detectados.map((r) => ({
                host: r.host,
                porta: Number(porta),
                status: r.status // 'ATIVO' ou 'ERRO', já vindo do Rust
            })),
            skipDuplicates: true
        });
    },

    async listarTodos() {
        return await prisma.servidor.findMany({
            select: { id: true, host: true, porta: true, status: true },
            orderBy: { host: 'asc' }
        });
    },

    async listarTodosParaVerificacao() {
        return await prisma.servidor.findMany({
            select: { host: true, porta: true }
        });
    },

    async buscarConfiguracaoRede() {
        return await prisma.configuracaoRede.findUnique({ where: { id: 1 } });
    },

    /// Aplica o veredito do Rust, correlacionando por host (é @unique no
    /// schema) — não por id, porque na varredura inicial os hosts ainda
    /// não existem no banco quando são verificados.
    async aplicarResultadosVerificacao(resultados) {
        const operacoes = [];

        for (const r of resultados) {
            if (r.status === 'SEM_RESPOSTA') {
                const servidor = await prisma.servidor.findUnique({ where: { host: r.host } });
                if (!servidor) continue; // nunca foi cadastrado — nada a fazer

                const temArquivos = await prisma.arquivo.count({ where: { servidor_id: servidor.id } });
                if (temArquivos === 0) {
                    operacoes.push(prisma.servidor.delete({ where: { host: r.host } }));
                } else {
                    operacoes.push(
                        prisma.servidor.update({ where: { host: r.host }, data: { status: 'ERRO' } })
                    );
                }
                continue;
            }

            operacoes.push(
                prisma.servidor.update({ where: { host: r.host }, data: { status: r.status } })
            );
        }

        if (operacoes.length > 0) {
            await prisma.$transaction(operacoes);
        }
    }
};

export default adminModel;