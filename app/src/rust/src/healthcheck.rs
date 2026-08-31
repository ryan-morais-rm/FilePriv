use crate::proto::filepriv::{
    ResultadoVerificacao, ServidorParaVerificar, StatusVerificacao, VerificarServidoresRequest,
    VerificarServidoresResponse,
};
use ssh2::Session;
use std::io::Write;
use std::net::TcpStream;
use std::path::Path;
use std::time::Duration;

const TIMEOUT_POR_SERVIDOR: Duration = Duration::from_secs(5);

/// Verifica todos os servidores em paralelo (uma thread bloqueante por
/// servidor, já que `ssh2` é síncrona) e devolve o veredito de cada um,
/// correlacionado por host — funciona tanto pra hosts já cadastrados
/// quanto pra candidatos que ainda não existem no banco.
pub async fn verificar_todos(request: VerificarServidoresRequest) -> VerificarServidoresResponse {
    let usuario_ssh = request.usuario_ssh;
    let chave_privada = request.chave_privada;
    let diretorio_remoto = request.diretorio_remoto;

    let tarefas: Vec<_> = request
        .servidores
        .into_iter()
        .map(|servidor| {
            let usuario_ssh = usuario_ssh.clone();
            let chave_privada = chave_privada.clone();
            let diretorio_remoto = diretorio_remoto.clone();

            tokio::task::spawn_blocking(move || {
                verificar_um_bloqueante(servidor, usuario_ssh, chave_privada, diretorio_remoto)
            })
        })
        .collect();

    let mut resultados = Vec::with_capacity(tarefas.len());
    for tarefa in tarefas {
        match tarefa.await {
            Ok(resultado) => resultados.push(resultado),
            Err(e) => eprintln!("[healthcheck] tarefa de verificação entrou em pânico: {e}"),
        }
    }

    VerificarServidoresResponse { resultados }
}

fn verificar_um_bloqueante(
    servidor: ServidorParaVerificar,
    usuario_ssh: String,
    chave_privada: String,
    diretorio_remoto: String,
) -> ResultadoVerificacao {
    let endereco = format!("{}:{}", servidor.host, servidor.porta);

    let resultado = (|| -> Result<(), String> {
        let socket_addr = endereco
            .parse()
            .map_err(|e| format!("sem resposta (endereço inválido): {e}"))?;

        let tcp = TcpStream::connect_timeout(&socket_addr, TIMEOUT_POR_SERVIDOR)
            .map_err(|e| format!("sem resposta: {e}"))?;
        tcp.set_read_timeout(Some(TIMEOUT_POR_SERVIDOR)).ok();
        tcp.set_write_timeout(Some(TIMEOUT_POR_SERVIDOR)).ok();

        let mut sessao = Session::new().map_err(|e| format!("falha ao iniciar sessão: {e}"))?;
        sessao.set_tcp_stream(tcp);
        sessao
            .handshake()
            .map_err(|e| format!("sem resposta (handshake): {e}"))?;

        sessao
            .userauth_pubkey_memory(&usuario_ssh, None, &chave_privada, None)
            .map_err(|e| format!("sem resposta (autenticação): {e}"))?;

        let sftp = sessao
            .sftp()
            .map_err(|e| format!("falha ao abrir canal SFTP: {e}"))?;

        let caminho_probe = format!(
            "{}/.filepriv-healthcheck-{}",
            diretorio_remoto.trim_end_matches('/'),
            std::process::id()
        );
        let mut arquivo_probe = sftp.create(Path::new(&caminho_probe)).map_err(|e| {
            format!("diretório remoto inacessível ou sem permissão de escrita: {e}")
        })?;
        arquivo_probe
            .write_all(b"healthcheck")
            .map_err(|e| format!("falha ao escrever arquivo de teste: {e}"))?;
        drop(arquivo_probe);
        sftp.unlink(Path::new(&caminho_probe)).ok();

        Ok(())
    })();

    match resultado {
        Ok(()) => ResultadoVerificacao {
            host: servidor.host,
            porta: servidor.porta,
            status: StatusVerificacao::Ativo as i32,
            detalhe: String::new(),
        },
        Err(motivo) if motivo.starts_with("sem resposta") => ResultadoVerificacao {
            host: servidor.host,
            porta: servidor.porta,
            status: StatusVerificacao::SemResposta as i32,
            detalhe: motivo,
        },
        Err(motivo) => ResultadoVerificacao {
            host: servidor.host,
            porta: servidor.porta,
            status: StatusVerificacao::Erro as i32,
            detalhe: motivo,
        },
    }
}