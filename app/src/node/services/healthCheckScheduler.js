import adminModel from '../models/adminModel.js';
import { verificarServidores } from './rustClient.js';

const INTERVALO_MS = 5 * 60 * 1000; // 5 minutos

async function executarVerificacao() {
    try {
        const config = await adminModel.buscarConfiguracaoRede();
        if (!config) {
            console.log('[healthcheck] Nenhuma configuração de rede cadastrada ainda — pulando.');
            return;
        }

        const servidores = await adminModel.listarTodosParaVerificacao();
        if (servidores.length === 0) {
            console.log('[healthcheck] Nenhum servidor cadastrado ainda — pulando.');
            return;
        }

        const resposta = await verificarServidores({
            servidores,
            usuarioSsh: config.usuario_ssh,
            chavePrivada: config.chave_privada,
            diretorioRemoto: config.diretorio_remoto
        });

        await adminModel.aplicarResultadosVerificacao(resposta.resultados);

        const ativos = resposta.resultados.filter((r) => r.status === 'ATIVO').length;
        const comErro = resposta.resultados.filter((r) => r.status === 'ERRO').length;
        const semResposta = resposta.resultados.filter((r) => r.status === 'SEM_RESPOSTA').length;

        console.log(
            `[healthcheck] ${ativos} ativo(s), ${comErro} com erro, ${semResposta} sem resposta (removidos do banco, salvo os que ainda têm arquivo).`
        );
    } catch (error) {
        console.error('[healthcheck] Falha ao executar verificação:', error);
    }
}

export function iniciarHealthCheck() {
    executarVerificacao();
    setInterval(executarVerificacao, INTERVALO_MS);
}