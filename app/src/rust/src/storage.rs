use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::Path;

/// Dados de conexão de um servidor, resolvidos a partir do que o Node
/// enviou nesta requisição (originado da ConfiguracaoRede cadastrada pelo
/// admin) — nunca lido de disco local nem chumbado no Rust.
#[derive(Debug, Clone)]
pub struct ConexaoServidor {
    pub host: String,
    pub porta: u16,
    pub usuario_ssh: String,
    pub chave_privada: String,
    pub diretorio_remoto: String,
}

#[derive(Debug)]
pub struct ErroEnvio(pub String);

impl std::fmt::Display for ErroEnvio {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}
impl std::error::Error for ErroEnvio {}

/// Conecta e autentica via SSH (chave em memória), devolvendo o canal
/// SFTP já aberto e o caminho completo do arquivo remoto — compartilhado
/// entre envio, leitura e exclusão, pra não repetir a lógica de conexão
/// três vezes.
fn abrir_sftp(
    servidor: &ConexaoServidor,
    nome_remoto: &str,
) -> Result<(ssh2::Sftp, String), ErroEnvio> {
    let endereco = format!("{}:{}", servidor.host, servidor.porta);

    let tcp = TcpStream::connect(&endereco)
        .map_err(|e| ErroEnvio(format!("Não foi possível conectar em {endereco}: {e}")))?;

    let mut sessao =
        Session::new().map_err(|e| ErroEnvio(format!("Falha ao iniciar sessão SSH: {e}")))?;
    sessao.set_tcp_stream(tcp);
    sessao
        .handshake()
        .map_err(|e| ErroEnvio(format!("Falha no handshake SSH com {endereco}: {e}")))?;

    sessao
        .userauth_pubkey_memory(&servidor.usuario_ssh, None, &servidor.chave_privada, None)
        .map_err(|e| ErroEnvio(format!("Falha na autenticação SSH em {endereco}: {e}")))?;

    if !sessao.authenticated() {
        return Err(ErroEnvio(format!("Autenticação SSH recusada por {endereco}")));
    }

    let sftp = sessao
        .sftp()
        .map_err(|e| ErroEnvio(format!("Falha ao abrir canal SFTP com {endereco}: {e}")))?;

    let caminho_remoto = format!(
        "{}/{}",
        servidor.diretorio_remoto.trim_end_matches('/'),
        nome_remoto
    );

    Ok((sftp, caminho_remoto))
}

/// Envia o blob (já cifrado) para o servidor via SFTP. Roda numa thread
/// bloqueante própria porque `ssh2` é síncrona — evita travar o runtime
/// async do tonic.
pub async fn enviar_para_servidor(
    servidor: ConexaoServidor,
    nome_remoto: String,
    blob: Vec<u8>,
) -> Result<(), ErroEnvio> {
    tokio::task::spawn_blocking(move || enviar_sftp_bloqueante(servidor, nome_remoto, blob))
        .await
        .map_err(|e| ErroEnvio(format!("Falha na thread de envio SFTP: {e}")))?
}

fn enviar_sftp_bloqueante(
    servidor: ConexaoServidor,
    nome_remoto: String,
    blob: Vec<u8>,
) -> Result<(), ErroEnvio> {
    let (sftp, caminho_remoto) = abrir_sftp(&servidor, &nome_remoto)?;

    let mut arquivo_remoto = sftp
        .create(Path::new(&caminho_remoto))
        .map_err(|e| ErroEnvio(format!("Falha ao criar arquivo remoto {caminho_remoto}: {e}")))?;

    arquivo_remoto
        .write_all(&blob)
        .map_err(|e| ErroEnvio(format!("Falha ao gravar dados em {caminho_remoto}: {e}")))?;

    Ok(())
}

/// Busca o blob (ainda cifrado) de volta do servidor via SFTP.
pub async fn baixar_de_servidor(
    servidor: ConexaoServidor,
    nome_remoto: String,
) -> Result<Vec<u8>, ErroEnvio> {
    tokio::task::spawn_blocking(move || baixar_sftp_bloqueante(servidor, nome_remoto))
        .await
        .map_err(|e| ErroEnvio(format!("Falha na thread de download SFTP: {e}")))?
}

fn baixar_sftp_bloqueante(
    servidor: ConexaoServidor,
    nome_remoto: String,
) -> Result<Vec<u8>, ErroEnvio> {
    let (sftp, caminho_remoto) = abrir_sftp(&servidor, &nome_remoto)?;

    let mut arquivo_remoto = sftp
        .open(Path::new(&caminho_remoto))
        .map_err(|e| ErroEnvio(format!("Falha ao abrir arquivo remoto {caminho_remoto}: {e}")))?;

    let mut conteudo = Vec::new();
    arquivo_remoto
        .read_to_end(&mut conteudo)
        .map_err(|e| ErroEnvio(format!("Falha ao ler dados de {caminho_remoto}: {e}")))?;

    Ok(conteudo)
}

/// Apaga o arquivo remoto via SFTP. Idempotente por design: "arquivo já
/// não existe" (SSH_FX_NO_SUCH_FILE) conta como sucesso, não como erro —
/// evita travar uma exclusão repetida ou uma que já tinha sido feita antes
/// de uma resposta se perder no caminho.
pub async fn apagar_de_servidor(
    servidor: ConexaoServidor,
    nome_remoto: String,
) -> Result<(), ErroEnvio> {
    tokio::task::spawn_blocking(move || apagar_sftp_bloqueante(servidor, nome_remoto))
        .await
        .map_err(|e| ErroEnvio(format!("Falha na thread de exclusão SFTP: {e}")))?
}

fn apagar_sftp_bloqueante(servidor: ConexaoServidor, nome_remoto: String) -> Result<(), ErroEnvio> {
    let (sftp, caminho_remoto) = abrir_sftp(&servidor, &nome_remoto)?;

    match sftp.unlink(Path::new(&caminho_remoto)) {
        Ok(()) => Ok(()),
        Err(e) if e.code() == ssh2::ErrorCode::SFTP(2) => {
            // Código 2 do protocolo SFTP = SSH_FX_NO_SUCH_FILE.
            println!(
                "[storage] Arquivo remoto {caminho_remoto} já não existia — tratado como sucesso."
            );
            Ok(())
        }
        Err(e) => Err(ErroEnvio(format!("Falha ao apagar {caminho_remoto}: {e}"))),
    }
}