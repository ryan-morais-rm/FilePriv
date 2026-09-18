use aws_config::imds::credentials::ImdsCredentialsProvider;
use aws_config::BehaviorVersion;
use aws_credential_types::provider::ProvideCredentials;
use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
use uuid::Uuid;

const PREFIXO_CHAVE_ARQUIVO: &str = "chaves";
const PREFIXO_CREDENCIAL_SSH: &str = "credenciais_ssh";

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

    let access_key = std::env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| "Nem IMDS nem AWS_ACCESS_KEY_ID disponíveis.".to_string())?;
    let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| "AWS_SECRET_ACCESS_KEY não definida.".to_string())?;

    println!("[s3] Autenticado via AK/SK (variáveis de ambiente) — modo de desenvolvimento.");
    Ok(Credentials::new(access_key, secret_key, None, None, "filepriv-static"))
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

/// Rotina genérica de gravação para SSH e SFTP
async fn salvar_objeto(prefixo: &str, extensao: &str, bytes: &[u8]) -> Result<String, String> {
    let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "filepriv-s3".to_string());
    let cliente = montar_cliente().await?;

    let referencia = format!("{prefixo}/{}.{extensao}", Uuid::new_v4());

    cliente
        .put_object()
        .bucket(&bucket)
        .key(&referencia)
        .body(ByteStream::from(bytes.to_vec()))
        .send()
        .await
        .map_err(|e| format!("Falha ao gravar objeto no S3 (bucket '{bucket}'): {e}"))?;

    Ok(referencia)
}

async fn buscar_objeto(referencia: &str) -> Result<Vec<u8>, String> {
    let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "filepriv-s3".to_string());
    let cliente = montar_cliente().await?;

    let saida = cliente
        .get_object()
        .bucket(&bucket)
        .key(referencia)
        .send()
        .await
        .map_err(|e| format!("Falha ao buscar objeto no S3 ({referencia}): {e}"))?;

    let bytes = saida
        .body
        .collect()
        .await
        .map_err(|e| format!("Falha ao ler o corpo do objeto vindo do S3: {e}"))?
        .into_bytes();

    Ok(bytes.to_vec())
}

async fn apagar_objeto(referencia: &str) -> Result<(), String> {
    let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "filepriv-s3".to_string());
    let cliente = montar_cliente().await?;

    cliente
        .delete_object()
        .bucket(&bucket)
        .key(referencia)
        .send()
        .await
        .map_err(|e| format!("Falha ao apagar objeto no S3 ({referencia}): {e}"))?;

    Ok(())
}

/// Chave de criptografia dos arquivos
pub async fn salvar_chave(chave_bytes: &[u8]) -> Result<String, String> {
    let referencia = salvar_objeto(PREFIXO_CHAVE_ARQUIVO, "key", chave_bytes).await?;
    println!("[s3] Chave de arquivo gravada em '{referencia}'.");
    Ok(referencia)
}

pub async fn buscar_chave(chave_referencia: &str) -> Result<Vec<u8>, String> {
    buscar_objeto(chave_referencia).await
}

pub async fn apagar_chave(chave_referencia: &str) -> Result<(), String> {
    apagar_objeto(chave_referencia).await
}

/// Credenciais SSH para comunicação com as VMs
pub async fn salvar_credencial_ssh(chave_privada_bytes: &[u8]) -> Result<String, String> {
    let referencia = salvar_objeto(PREFIXO_CREDENCIAL_SSH, "pem", chave_privada_bytes).await?;
    println!("[s3] Credencial SSH gravada em '{referencia}'.");
    Ok(referencia)
}

pub async fn buscar_credencial_ssh(referencia: &str) -> Result<Vec<u8>, String> {
    buscar_objeto(referencia).await
}

pub async fn apagar_credencial_ssh(referencia: &str) -> Result<(), String> {
    apagar_objeto(referencia).await
}