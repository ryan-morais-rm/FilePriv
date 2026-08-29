use crate::servidores::ServidorConfig;
use ssh2::Session;
use std::io::Write;
use std::net::TcpStream;
use std::path::Path;

#[derive(Debug)]
pub struct ErroEnvio(pub String);

impl std::fmt::Display for ErroEnvio {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}
impl std::error::Error for ErroEnvio {}

/// Envia o blob (já cifrado) para o servidor via SFTP, autenticando por
/// chave privada. Roda numa thread bloqueante própria porque `ssh2` é
/// síncrona — evita travar o runtime async do tonic.
pub async fn enviar_para_servidor(
    servidor: ServidorConfig,
    nome_remoto: String,
    blob: Vec<u8>,
) -> Result<(), ErroEnvio> {
    tokio::task::spawn_blocking(move || enviar_sftp_bloqueante(servidor, nome_remoto, blob))
        .await
        .map_err(|e| ErroEnvio(format!("Falha na thread de envio SFTP: {e}")))?
}

fn enviar_sftp_bloqueante(
    servidor: ServidorConfig,
    nome_remoto: String,
    blob: Vec<u8>,
) -> Result<(), ErroEnvio> {
    let endereco = format!("{}:{}", servidor.host, servidor.porta_ssh);

    let tcp = TcpStream::connect(&endereco)
        .map_err(|e| ErroEnvio(format!("Não foi possível conectar em {endereco}: {e}")))?;

    let mut sessao =
        Session::new().map_err(|e| ErroEnvio(format!("Falha ao iniciar sessão SSH: {e}")))?;
    sessao.set_tcp_stream(tcp);
    sessao
        .handshake()
        .map_err(|e| ErroEnvio(format!("Falha no handshake SSH com {endereco}: {e}")))?;

    sessao
        .userauth_pubkey_file(
            &servidor.usuario_ssh,
            None,
            Path::new(&servidor.caminho_chave_privada),
            None,
        )
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

    let mut arquivo_remoto = sftp
        .create(Path::new(&caminho_remoto))
        .map_err(|e| ErroEnvio(format!("Falha ao criar arquivo remoto {caminho_remoto}: {e}")))?;

    arquivo_remoto
        .write_all(&blob)
        .map_err(|e| ErroEnvio(format!("Falha ao gravar dados em {caminho_remoto}: {e}")))?;

    Ok(())
}