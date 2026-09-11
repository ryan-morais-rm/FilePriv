mod crypto;
mod grpc;
mod healthcheck;
mod proto;
mod s3_keys;
mod servidores;
mod storage;

use grpc::ProcessadorArquivoService;
use proto::filepriv::processador_arquivo_server::ProcessadorArquivoServer;
use tonic::transport::{Identity, Server, ServerTlsConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RUST_GRPC_LISTEN_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:50051".to_string())
        .parse()?;

    let caminho_cert = std::env::var("TLS_CERT_PATH")
        .unwrap_or_else(|_| "/etc/filepriv/tls/server.crt".to_string());
    let caminho_key = std::env::var("TLS_KEY_PATH")
        .unwrap_or_else(|_| "/etc/filepriv/tls/server.key".to_string());

    let cert = std::fs::read_to_string(&caminho_cert)
        .map_err(|e| format!("Falha ao ler certificado TLS em {caminho_cert}: {e}"))?;
    let key = std::fs::read_to_string(&caminho_key)
        .map_err(|e| format!("Falha ao ler chave TLS em {caminho_key}: {e}"))?;

    let identidade = Identity::from_pem(cert, key);
    let tls_config = ServerTlsConfig::new().identity(identidade);

    println!("[filepriv-rust] serviço ouvindo em {addr} (TLS habilitado)");

    Server::builder()
        .tls_config(tls_config)?
        .add_service(ProcessadorArquivoServer::new(
            ProcessadorArquivoService::default(),
        ))
        .serve(addr)
        .await?;

    Ok(())
}