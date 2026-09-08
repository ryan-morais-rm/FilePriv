use sha2::{Digest, Sha256};
use tonic::{Request, Response, Status, Streaming};
use uuid::Uuid;

use crate::crypto::cifrar_arquivo;
use crate::healthcheck::verificar_todos;
use crate::proto::filepriv::{
    arquivo_chunk_upload::Conteudo, processador_arquivo_server::ProcessadorArquivo,
    ArquivoChunkUpload, MetadadosUpload, RespostaUpload, VerificarServidoresRequest,
    VerificarServidoresResponse,
};
use crate::servidores::escolher_servidor_menos_carregado;
use crate::storage::{enviar_para_servidor, ConexaoServidor};

#[derive(Default)]
pub struct ProcessadorArquivoService;

fn resposta_erro(mensagem: impl Into<String>) -> RespostaUpload {
    RespostaUpload {
        sucesso: false,
        mensagem_erro: mensagem.into(),
        chave_referencia: String::new(),
        servidor_id: 0,
        tamanho: 0,
        hash: String::new(),
    }
}

#[tonic::async_trait]
impl ProcessadorArquivo for ProcessadorArquivoService {
    async fn enviar_arquivo(
        &self,
        request: Request<Streaming<ArquivoChunkUpload>>,
    ) -> Result<Response<RespostaUpload>, Status> {
        let mut stream = request.into_inner();

        let mut metadados: Option<MetadadosUpload> = None;
        let mut conteudo: Vec<u8> = Vec::new();

        while let Some(mensagem) = stream.message().await? {
            match mensagem.conteudo {
                Some(Conteudo::Metadados(m)) => metadados = Some(m),
                Some(Conteudo::Pedaco(bytes)) => conteudo.extend_from_slice(&bytes),
                None => {}
            }
        }

        let Some(metadados) = metadados else {
            return Ok(Response::new(resposta_erro(
                "Metadados não recebidos antes dos bytes.",
            )));
        };

        let Some(servidor_escolhido) =
            escolher_servidor_menos_carregado(&metadados.servidores_disponiveis).cloned()
        else {
            return Ok(Response::new(resposta_erro(
                "Nenhum servidor disponível informado pelo Node.",
            )));
        };

        if metadados.usuario_ssh.is_empty()
            || metadados.chave_privada.is_empty()
            || metadados.diretorio_remoto.is_empty()
        {
            return Ok(Response::new(resposta_erro(
                "Credenciais de conexão (usuario_ssh/chave_privada/diretorio_remoto) não foram informadas pelo Node.",
            )));
        }

        let conexao = ConexaoServidor {
            host: servidor_escolhido.host.clone(),
            porta: servidor_escolhido.porta as u16,
            usuario_ssh: metadados.usuario_ssh.clone(),
            chave_privada: metadados.chave_privada.clone(),
            diretorio_remoto: metadados.diretorio_remoto.clone(),
        };

        let (blob_cifrado, chave) = match cifrar_arquivo(&conteudo) {
            Ok(resultado) => resultado,
            Err(e) => {
                return Ok(Response::new(resposta_erro(format!(
                    "Falha ao criptografar o arquivo: {e}"
                ))));
            }
        };

        let fingerprint_chave = &hex::encode(chave)[..8];
        let hash = hex::encode(Sha256::digest(&blob_cifrado));
        let tamanho = blob_cifrado.len() as i32;
        let nome_remoto = format!("{}.bin", Uuid::new_v4());

        let host_exibicao = conexao.host.clone();
        let porta_exibicao = conexao.porta;

        if let Err(e) = enviar_para_servidor(conexao, nome_remoto.clone(), blob_cifrado).await {
            return Ok(Response::new(resposta_erro(format!(
                "Falha ao enviar arquivo via SFTP para {host_exibicao}: {e}"
            ))));
        }

        println!(
            "[filepriv-rust] Arquivo '{}' ({} bytes cifrados) do usuário {} enviado via SFTP para {}:{} como '{}'. Chave (fingerprint): {}...",
            metadados.nome_arquivo, tamanho, metadados.usuario_id,
            host_exibicao, porta_exibicao, nome_remoto, fingerprint_chave
        );

        Ok(Response::new(RespostaUpload {
            sucesso: true,
            mensagem_erro: String::new(),
            chave_referencia: format!("PENDENTE-CHAVE-NAO-PERSISTIDA-{}", Uuid::new_v4()),
            servidor_id: servidor_escolhido.id,
            tamanho,
            hash,
        }))
    }

    async fn verificar_servidores(
        &self,
        request: Request<VerificarServidoresRequest>,
    ) -> Result<Response<VerificarServidoresResponse>, Status> {
        let resposta = verificar_todos(request.into_inner()).await;
        Ok(Response::new(resposta))
    }
}