mod crypto;
mod grpc;
mod healthcheck;
mod proto;
mod servidores;
mod storage;

use grpc::ProcessadorArquivoService;
use proto::filepriv::processador_arquivo_server::ProcessadorArquivoServer;
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("RUST_GRPC_LISTEN_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:50051".to_string())
        .parse()?;

    println!("[filepriv-rust] serviço ouvindo em {addr}");

    Server::builder()
        .add_service(ProcessadorArquivoServer::new(
            ProcessadorArquivoService::default(),
        ))
        .serve(addr)
        .await?;

    Ok(())
}