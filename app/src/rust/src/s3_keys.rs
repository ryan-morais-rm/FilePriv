use aws_config::imds::credentials::ImdsCredentialsProvider;
use aws_config::BehaviorVersion;
use aws_credential_types::provider::ProvideCredentials;
use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
use uuid::Uuid;

const PREFIXO_OBJETO: &str = "chaves";

async fn resolver_credenciais() -> Result<Credentials, String> {
    let imds = ImdsCredentialsProvider::builder().build();
    match imds.provide_credentials().await {
        Ok(creds) => {
            println!("[s3] Autenticado via IAM Role (IMDS).");
            return Ok(creds);
        }
        Err(e) => {
            println!("[s3] IMDS indisponível (esperado fora da EC2): {e}. Tentando AK/SK...");
        }
    }

    // Bloco temporário
    let access_key = std::env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| "Nem IMDS nem AWS_ACCESS_KEY_ID disponíveis.".to_string())?;
    let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| "AWS_SECRET_ACCESS_KEY não definida.".to_string())?;

    println!("[s3] Autenticado via AK/SK (variáveis de ambiente) — modo de desenvolvimento.");
    Ok(Credentials::new(access_key, secret_key, None, None, "filepriv-static"))
    // Bloco temporário
}

async fn montar_cliente() -> Result<Client, String> {
    let credenciais = resolver_credenciais().await?;
    let regiao = std::env::var("AWS_S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(regiao))
        .credentials_provider(credenciais)
        .load()
        .await;

    Ok(Client::new(&config))
}

/// Sobe a chave de criptografia (bytes brutos, nunca em texto/log) para o
/// bucket dedicado, num objeto novo por arquivo. Retorna a referência
/// (caminho do objeto) que o Node vai gravar em `chave_referencia`.
pub async fn salvar_chave(chave_bytes: &[u8]) -> Result<String, String> {
    let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "filepriv-s3".to_string());
    let cliente = montar_cliente().await?;

    let chave_referencia = format!("{PREFIXO_OBJETO}/{}.key", Uuid::new_v4());

    cliente
        .put_object()
        .bucket(&bucket)
        .key(&chave_referencia)
        .body(ByteStream::from(chave_bytes.to_vec()))
        .send()
        .await
        .map_err(|e| format!("Falha ao gravar a chave no S3 (bucket '{bucket}'): {e}"))?;

    println!("[s3] Chave gravada em s3://{bucket}/{chave_referencia}");

    Ok(chave_referencia)
}

/// Busca a chave de volta do S3, pra descriptografar no download.
pub async fn buscar_chave(chave_referencia: &str) -> Result<Vec<u8>, String> {
    let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "filepriv-s3".to_string());
    let cliente = montar_cliente().await?;

    let saida = cliente
        .get_object()
        .bucket(&bucket)
        .key(chave_referencia)
        .send()
        .await
        .map_err(|e| format!("Falha ao buscar a chave no S3 ({chave_referencia}): {e}"))?;

    let bytes = saida
        .body
        .collect()
        .await
        .map_err(|e| format!("Falha ao ler o corpo da chave vinda do S3: {e}"))?
        .into_bytes();

    Ok(bytes.to_vec())
}

/// Apaga a chave do bucket. É best-effort por design — quem chama (ver
/// grpc.rs) decide se uma falha aqui deve impedir a confirmação de
/// exclusão. Não deveria: uma chave órfã sem arquivo associado não
/// representa risco nenhum.
pub async fn apagar_chave(chave_referencia: &str) -> Result<(), String> {
    let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "filepriv-s3".to_string());
    let cliente = montar_cliente().await?;

    cliente
        .delete_object()
        .bucket(&bucket)
        .key(chave_referencia)
        .send()
        .await
        .map_err(|e| format!("Falha ao apagar a chave no S3 ({chave_referencia}): {e}"))?;

    Ok(())
}