use serde_json::json;
use serde::Deserialize;

const OAUTH_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const DRIVE_API_BASE: &str = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE: &str = "https://www.googleapis.com/upload/drive/v3";
const PASTA_RAIZ_NOME: &str = "FilePriv";
const DRIVE_MIME_PASTA: &str = "application/vnd.google-apps.folder";

#[derive(Debug, Clone)]
pub struct ConexaoGoogleDriveExterno {
    pub pasta_raiz_id: String,
    pub credencial_referencia: String,
}

#[derive(Deserialize)]
struct RespostaToken {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
}

#[derive(Deserialize)]
struct RespostaArquivoDrive {
    id: String,
}

#[derive(Deserialize)]
struct RespostaListaArquivos {
    files: Vec<RespostaArquivoDrive>,
}

fn client_id() -> Result<String, String> {
    std::env::var("GOOGLE_OAUTH_CLIENT_ID").map_err(|_| "GOOGLE_OAUTH_CLIENT_ID não definida.".to_string())
}

fn client_secret() -> Result<String, String> {
    std::env::var("GOOGLE_OAUTH_CLIENT_SECRET").map_err(|_| "GOOGLE_OAUTH_CLIENT_SECRET não definida.".to_string())
}

/// Troca o `code` do fluxo OAuth por um par access_token/refresh_token.
/// Chamado uma única vez, na conexão (ConectarProvedorDrive).
pub async fn trocar_code_por_tokens(code: &str, redirect_uri: &str) -> Result<(String, String), String> {
    let cliente = reqwest::Client::new();

    let resposta = cliente
        .post(OAUTH_TOKEN_URL)
        .form(&[
            ("code", code),
            ("client_id", client_id()?.as_str()),
            ("client_secret", client_secret()?.as_str()),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Falha ao trocar code por tokens: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Google recusou o code: {}", resposta.text().await.unwrap_or_default()));
    }

    let dados: RespostaToken = resposta
        .json()
        .await
        .map_err(|e| format!("Resposta de token do Google em formato inesperado: {e}"))?;

    let refresh_token = dados.refresh_token.ok_or_else(|| {
        "Google não devolveu refresh_token (provável reconexão sem prompt=consent).".to_string()
    })?;

    Ok((dados.access_token, refresh_token))
}

/// Troca o refresh_token (longa duração) por um access_token novo (~1h).
/// Chamado antes de cada operação real na Drive API.
async fn obter_access_token(refresh_token: &str) -> Result<String, String> {
    let cliente = reqwest::Client::new();

    let resposta = cliente
        .post(OAUTH_TOKEN_URL)
        .form(&[
            ("refresh_token", refresh_token),
            ("client_id", client_id()?.as_str()),
            ("client_secret", client_secret()?.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Falha ao renovar access_token: {e}"))?;

    if !resposta.status().is_success() {
        // invalid_grant aqui normalmente significa token revogado pelo
        // usuário fora do app — propagamos a mensagem crua pro chamador.
        return Err(format!(
            "Falha ao renovar access_token (token pode ter sido revogado): {}",
            resposta.text().await.unwrap_or_default()
        ));
    }

    let dados: RespostaToken = resposta
        .json()
        .await
        .map_err(|e| format!("Resposta de refresh em formato inesperado: {e}"))?;

    Ok(dados.access_token)
}

async fn encontrar_ou_criar_pasta(
    access_token: &str,
    nome: &str,
    pasta_pai_id: Option<&str>,
) -> Result<String, String> {
    let cliente = reqwest::Client::new();
    let nome_escapado = nome.replace('\'', "\\'");

    let mut query = format!("name = '{nome_escapado}' and mimeType = '{DRIVE_MIME_PASTA}' and trashed = false");
    match pasta_pai_id {
        Some(pai) => query.push_str(&format!(" and '{pai}' in parents")),
        None => query.push_str(" and 'root' in parents"),
    }

    let resposta = cliente
        .get(format!("{DRIVE_API_BASE}/files"))
        .bearer_auth(access_token)
        .query(&[("q", query.as_str()), ("fields", "files(id,name)")])
        .send()
        .await
        .map_err(|e| format!("Falha ao buscar pasta '{nome}' no Drive: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Drive recusou a busca de pasta '{nome}': {}", resposta.text().await.unwrap_or_default()));
    }

    let encontrados: RespostaListaArquivos = resposta
        .json()
        .await
        .map_err(|e| format!("Resposta de busca de pasta em formato inesperado: {e}"))?;

    if let Some(primeira) = encontrados.files.into_iter().next() {
        return Ok(primeira.id);
    }

    let mut corpo_criacao = json!({ "name": nome, "mimeType": DRIVE_MIME_PASTA });
    if let Some(pai) = pasta_pai_id {
        corpo_criacao["parents"] = json!([pai]);
    }

    let resposta = cliente
        .post(format!("{DRIVE_API_BASE}/files"))
        .bearer_auth(access_token)
        .json(&corpo_criacao)
        .send()
        .await
        .map_err(|e| format!("Falha ao criar pasta '{nome}' no Drive: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Drive recusou a criação da pasta '{nome}': {}", resposta.text().await.unwrap_or_default()));
    }

    let criada: RespostaArquivoDrive = resposta
        .json()
        .await
        .map_err(|e| format!("Resposta de criação de pasta em formato inesperado: {e}"))?;

    Ok(criada.id)
}

/// Manipulação da pasta raiz FilePriv/ no Drive do usuário.
pub async fn criar_pasta_raiz(refresh_token: &str) -> Result<String, String> {
    let access_token = obter_access_token(refresh_token).await?;
    encontrar_ou_criar_pasta(&access_token, PASTA_RAIZ_NOME, None).await
}

async fn resolver_subpasta_categoria(
    access_token: &str,
    pasta_raiz_id: &str,
    categoria: &str,
) -> Result<String, String> {
    encontrar_ou_criar_pasta(access_token, categoria, Some(pasta_raiz_id)).await
}

/// Envia o blob já cifrado pra dentro da subpasta de categoria.
/// Devolve o fileId do Drive — vira `nome_remoto` no Prisma.
pub async fn enviar(
    conexao: &ConexaoGoogleDriveExterno,
    refresh_token: &str,
    categoria: &str,
    nome_arquivo: &str,
    blob: Vec<u8>,
) -> Result<String, String> {
    let access_token = obter_access_token(refresh_token).await?;
    let subpasta_id = resolver_subpasta_categoria(&access_token, &conexao.pasta_raiz_id, categoria).await?;

    let metadados = json!({ "name": nome_arquivo, "parents": [subpasta_id] }).to_string();
    let boundary = format!("filepriv-{}", uuid::Uuid::new_v4());

    let mut corpo = Vec::new();
    corpo.extend_from_slice(format!("--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n").as_bytes());
    corpo.extend_from_slice(metadados.as_bytes());
    corpo.extend_from_slice(format!("\r\n--{boundary}\r\nContent-Type: application/octet-stream\r\n\r\n").as_bytes());
    corpo.extend_from_slice(&blob);
    corpo.extend_from_slice(format!("\r\n--{boundary}--").as_bytes());

    let cliente = reqwest::Client::new();
    let resposta = cliente
        .post(format!("{DRIVE_UPLOAD_BASE}/files?uploadType=multipart"))
        .bearer_auth(&access_token)
        .header("Content-Type", format!("multipart/related; boundary={boundary}"))
        .body(corpo)
        .send()
        .await
        .map_err(|e| format!("Falha ao enviar arquivo ao Google Drive: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Drive recusou o upload: {}", resposta.text().await.unwrap_or_default()));
    }

    let criado: RespostaArquivoDrive = resposta
        .json()
        .await
        .map_err(|e| format!("Resposta de upload em formato inesperado: {e}"))?;

    Ok(criado.id)
}

pub async fn baixar(refresh_token: &str, file_id: &str) -> Result<Vec<u8>, String> {
    let access_token = obter_access_token(refresh_token).await?;
    let cliente = reqwest::Client::new();

    let resposta = cliente
        .get(format!("{DRIVE_API_BASE}/files/{file_id}"))
        .bearer_auth(access_token)
        .query(&[("alt", "media")])
        .send()
        .await
        .map_err(|e| format!("Falha ao buscar arquivo no Google Drive: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Drive recusou o download: {}", resposta.text().await.unwrap_or_default()));
    }

    resposta.bytes().await.map(|b| b.to_vec())
        .map_err(|e| format!("Falha ao ler o corpo do arquivo vindo do Drive: {e}"))
}

pub async fn apagar(refresh_token: &str, file_id: &str) -> Result<(), String> {
    let access_token = obter_access_token(refresh_token).await?;
    let cliente = reqwest::Client::new();

    let resposta = cliente
        .delete(format!("{DRIVE_API_BASE}/files/{file_id}"))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Falha ao apagar arquivo no Google Drive: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Drive recusou a exclusão: {}", resposta.text().await.unwrap_or_default()));
    }

    Ok(())
}

/// Usado para trocar o perfil de usuário
pub async fn mover_entre_categorias(
    conexao: &ConexaoGoogleDriveExterno,
    refresh_token: &str,
    file_id: &str,
    categoria_antiga: &str,
    categoria_nova: &str,
) -> Result<(), String> {
    let access_token = obter_access_token(refresh_token).await?;

    let subpasta_antiga = resolver_subpasta_categoria(&access_token, &conexao.pasta_raiz_id, categoria_antiga).await?;
    let subpasta_nova = resolver_subpasta_categoria(&access_token, &conexao.pasta_raiz_id, categoria_nova).await?;

    let cliente = reqwest::Client::new();
    let resposta = cliente
        .patch(format!("{DRIVE_API_BASE}/files/{file_id}"))
        .bearer_auth(access_token)
        .query(&[("addParents", subpasta_nova.as_str()), ("removeParents", subpasta_antiga.as_str())])
        .json(&json!({}))
        .send()
        .await
        .map_err(|e| format!("Falha ao mover arquivo no Google Drive: {e}"))?;

    if !resposta.status().is_success() {
        return Err(format!("Drive recusou o move: {}", resposta.text().await.unwrap_or_default()));
    }

    Ok(())
}