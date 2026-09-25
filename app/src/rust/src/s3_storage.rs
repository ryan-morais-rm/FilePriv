use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;

const REGIAO_PADRAO: &str = "us-east-1";

#[derive(Debug, Clone)]
pub struct ConexaoS3Externo {
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub regiao: String, // já resolvida — nunca vazia neste ponto
}

/// Região informada pelo usuário, ou us-east-1 se ele deixou em branco.
pub fn regiao_efetiva(regiao_informada: &str) -> String {
    if regiao_informada.trim().is_empty() {
        REGIAO_PADRAO.to_string()
    } else {
        regiao_informada.trim().to_string()
    }
}

async fn montar_cliente(conexao: &ConexaoS3Externo) -> Client {
    let credenciais = Credentials::new(
        &conexao.access_key,
        &conexao.secret_key,
        None,
        None,
        "filepriv-provedor-usuario",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(conexao.regiao.clone()))
        .credentials_provider(credenciais)
        .load()
        .await;

    Client::new(&config)
}

/// Testa a conexão com o bucket informado. Por decisão de produto, o
/// chamador (grpc.rs) não distingue a causa da falha — credencial
/// inválida, bucket inexistente e região errada resultam na mesma
/// mensagem genérica pro usuário.
pub async fn testar_conexao(conexao: &ConexaoS3Externo) -> Result<(), String> {
    let cliente = montar_cliente(conexao).await;

    cliente
        .head_bucket()
        .bucket(&conexao.bucket)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn enviar(conexao: &ConexaoS3Externo, nome_remoto: &str, blob: Vec<u8>) -> Result<(), String> {
    let cliente = montar_cliente(conexao).await;

    cliente
        .put_object()
        .bucket(&conexao.bucket)
        .key(nome_remoto)
        .body(ByteStream::from(blob))
        .send()
        .await
        .map_err(|e| format!("Falha ao gravar no S3 do usuário (bucket '{}'): {e}", conexao.bucket))?;

    Ok(())
}

pub async fn baixar(conexao: &ConexaoS3Externo, nome_remoto: &str) -> Result<Vec<u8>, String> {
    let cliente = montar_cliente(conexao).await;

    let saida = cliente
        .get_object()
        .bucket(&conexao.bucket)
        .key(nome_remoto)
        .send()
        .await
        .map_err(|e| format!("Falha ao buscar no S3 do usuário (bucket '{}'): {e}", conexao.bucket))?;

    let bytes = saida
        .body
        .collect()
        .await
        .map_err(|e| format!("Falha ao ler o corpo do objeto vindo do S3 do usuário: {e}"))?
        .into_bytes();

    Ok(bytes.to_vec())
}

pub async fn apagar(conexao: &ConexaoS3Externo, nome_remoto: &str) -> Result<(), String> {
    let cliente = montar_cliente(conexao).await;

    cliente
        .delete_object()
        .bucket(&conexao.bucket)
        .key(nome_remoto)
        .send()
        .await
        .map_err(|e| format!("Falha ao apagar no S3 do usuário (bucket '{}'): {e}", conexao.bucket))?;

    Ok(())
}