import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../proto/arquivo.proto');
const RUST_GRPC_ADDR = process.env.RUST_GRPC_ADDR || '172.16.10.1:50051';
const CHUNK_SIZE = 64 * 1024;
const DEADLINE_MS = 20000;
const HEALTHCHECK_DEADLINE_MS = 60000;
const DOWNLOAD_DEADLINE_MS = 30000; // busca + descriptografia + streaming de volta
const DELETE_DEADLINE_MS = 15000;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition).filepriv;

const client = new proto.ProcessadorArquivo(
    RUST_GRPC_ADDR,
    grpc.credentials.createInsecure() // TODO: TLS quando o Rust tiver certificado
);

export function processarArquivo({
    usuarioId, nomeArquivo, tipoArquivo, buffer, servidoresDisponiveis,
    usuarioSsh, chavePrivada, diretorioRemoto
}) {
    return new Promise((resolve, reject) => {
        const deadline = new Date(Date.now() + DEADLINE_MS);

        const call = client.EnviarArquivo(new grpc.Metadata(), { deadline }, (err, resposta) => {
            if (err) return reject(err);
            resolve(resposta);
        });

        call.on('error', () => {});

        call.write({
            metadados: {
                usuario_id: usuarioId,
                nome_arquivo: nomeArquivo,
                tipo_arquivo: tipoArquivo,
                servidores_disponiveis: servidoresDisponiveis,
                usuario_ssh: usuarioSsh,
                chave_privada: chavePrivada,
                diretorio_remoto: diretorioRemoto
            }
        });

        for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
            call.write({ pedaco: buffer.subarray(offset, offset + CHUNK_SIZE) });
        }

        call.end();
    });
}

export function verificarServidores({ servidores, usuarioSsh, chavePrivada, diretorioRemoto }) {
    return new Promise((resolve, reject) => {
        const deadline = new Date(Date.now() + HEALTHCHECK_DEADLINE_MS);

        const requisicao = {
            servidores,
            usuario_ssh: usuarioSsh,
            chave_privada: chavePrivada,
            diretorio_remoto: diretorioRemoto
        };

        client.VerificarServidores(requisicao, new grpc.Metadata(), { deadline }, (err, resposta) => {
            if (err) return reject(err);
            resolve(resposta);
        });
    });
}

/// Retorna o stream de leitura gRPC direto — o controller escuta 'data'
/// (cada mensagem tem um `.pedaco` em Buffer), 'end' e 'error'. Não é uma
/// Promise porque o dado chega aos poucos, não de uma vez.
export function baixarArquivo({ host, porta, usuarioSsh, chavePrivada, diretorioRemoto, nomeRemoto, chaveReferencia }) {
    const deadline = new Date(Date.now() + DOWNLOAD_DEADLINE_MS);

    return client.BaixarArquivo(
        {
            host,
            porta,
            usuario_ssh: usuarioSsh,
            chave_privada: chavePrivada,
            diretorio_remoto: diretorioRemoto,
            nome_remoto: nomeRemoto,
            chave_referencia: chaveReferencia
        },
        new grpc.Metadata(),
        { deadline }
    );
}

export function excluirArquivo({ host, porta, usuarioSsh, chavePrivada, diretorioRemoto, nomeRemoto, chaveReferencia }) {
    return new Promise((resolve, reject) => {
        const deadline = new Date(Date.now() + DELETE_DEADLINE_MS);

        client.ExcluirArquivo(
            {
                host,
                porta,
                usuario_ssh: usuarioSsh,
                chave_privada: chavePrivada,
                diretorio_remoto: diretorioRemoto,
                nome_remoto: nomeRemoto,
                chave_referencia: chaveReferencia
            },
            new grpc.Metadata(),
            { deadline },
            (err, resposta) => {
                if (err) return reject(err);
                resolve(resposta);
            }
        );
    });
}