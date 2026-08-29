import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../proto/arquivo.proto');
const RUST_GRPC_ADDR = process.env.RUST_GRPC_ADDR || '172.16.10.1:50051';
const CHUNK_SIZE = 64 * 1024; // 64KB por pedaço
const DEADLINE_MS = 20000;    // evita ficar pendurado se o Rust estiver fora do ar

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

export function processarArquivo({ usuarioId, nomeArquivo, tipoArquivo, buffer, servidoresDisponiveis }) {
    return new Promise((resolve, reject) => {
        const deadline = new Date(Date.now() + DEADLINE_MS);

        const call = client.EnviarArquivo(new grpc.Metadata(), { deadline }, (err, resposta) => {
            if (err) return reject(err);
            resolve(resposta);
        });

        call.on('error', () => {}); // erro já é tratado no callback acima

        call.write({
            metadados: {
                usuario_id: usuarioId,
                nome_arquivo: nomeArquivo,
                tipo_arquivo: tipoArquivo,
                servidores_disponiveis: servidoresDisponiveis
            }
        });

        for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
            call.write({ pedaco: buffer.subarray(offset, offset + CHUNK_SIZE) });
        }

        call.end();
    });
}