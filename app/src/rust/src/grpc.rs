use sha2::{Digest, Sha256};
use std::pin::Pin;
use tokio_stream::Stream;
use tonic::{Request, Response, Status, Streaming};
use uuid::Uuid;

use crate::crypto::{cifrar_arquivo, descriptografar_arquivo};
use crate::healthcheck::verificar_todos;
use crate::proto::filepriv::{
    arquivo_chunk_upload::Conteudo, processador_arquivo_server::ProcessadorArquivo,
    ArquivoChunkUpload, MetadadosUpload, PedacoArquivo, RespostaExclusao, RespostaUpload,
    SolicitacaoDownload, SolicitacaoExclusao, VerificarServidoresRequest,
    VerificarServidoresResponse,
};
use crate::s3_keys::{apagar_chave, buscar_chave, salvar_chave};
use crate::servidores::escolher_servidor_menos_carregado;
use crate::storage::{apagar_de_servidor, baixar_de_servidor, enviar_para_servidor, ConexaoServidor};

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
        nome_remoto: String::new(),
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

        let fingerprint_chave = &hex::encode(chave.as_slice())[..8];
        let hash = hex::encode(Sha256::digest(&blob_cifrado));
        let tamanho = blob_cifrado.len() as i32;
        let nome_remoto = format!("{}.bin", Uuid::new_v4());

        // A chave precisa estar salva de forma durável antes do arquivo ir
        // pro servidor — se o S3 falhar aqui, abortamos sem nunca ter
        // mandado um blob cifrado cuja chave não existe em lugar nenhum.
        let chave_referencia = match salvar_chave(chave.as_slice()).await {
            Ok(referencia) => referencia,
            Err(e) => {
                return Ok(Response::new(resposta_erro(format!(
                    "Falha ao salvar a chave de criptografia no S3: {e}"
                ))));
            }
        };

        let host_exibicao = conexao.host.clone();
        let porta_exibicao = conexao.porta;

        if let Err(e) = enviar_para_servidor(conexao, nome_remoto.clone(), blob_cifrado).await {
            return Ok(Response::new(resposta_erro(format!(
                "Falha ao enviar arquivo via SFTP para {host_exibicao}: {e}"
            ))));
        }

        println!(
            "[filepriv-rust] Arquivo '{}' ({} bytes cifrados) do usuário {} enviado via SFTP para {}:{} como '{}'. Chave salva em '{}' (fingerprint: {}...).",
            metadados.nome_arquivo, tamanho, metadados.usuario_id,
            host_exibicao, porta_exibicao, nome_remoto, chave_referencia, fingerprint_chave
        );

        Ok(Response::new(RespostaUpload {
            sucesso: true,
            mensagem_erro: String::new(),
            chave_referencia,
            servidor_id: servidor_escolhido.id,
            tamanho,
            hash,
            nome_remoto,
        }))
    }

    async fn verificar_servidores(
        &self,
        request: Request<VerificarServidoresRequest>,
    ) -> Result<Response<VerificarServidoresResponse>, Status> {
        let resposta = verificar_todos(request.into_inner()).await;
        Ok(Response::new(resposta))
    }

    type BaixarArquivoStream =
        Pin<Box<dyn Stream<Item = Result<PedacoArquivo, Status>> + Send + 'static>>;

    async fn baixar_arquivo(
        &self,
        request: Request<SolicitacaoDownload>,
    ) -> Result<Response<Self::BaixarArquivoStream>, Status> {
        let req = request.into_inner();

        if req.usuario_ssh.is_empty() || req.chave_privada.is_empty() || req.diretorio_remoto.is_empty() {
            return Err(Status::invalid_argument(
                "Credenciais de conexão não informadas pelo Node.",
            ));
        }
        if req.nome_remoto.is_empty() || req.chave_referencia.is_empty() {
            return Err(Status::invalid_argument(
                "nome_remoto e chave_referencia são obrigatórios.",
            ));
        }

        let chave_bytes = buscar_chave(&req.chave_referencia)
            .await
            .map_err(Status::internal)?;

        let conexao = ConexaoServidor {
            host: req.host.clone(),
            porta: req.porta as u16,
            usuario_ssh: req.usuario_ssh.clone(),
            chave_privada: req.chave_privada.clone(),
            diretorio_remoto: req.diretorio_remoto.clone(),
        };

        let blob_cifrado = baixar_de_servidor(conexao, req.nome_remoto.clone())
            .await
            .map_err(|e| Status::internal(e.to_string()))?;

        let conteudo = descriptografar_arquivo(&blob_cifrado, &chave_bytes)
            .map_err(Status::internal)?;

        println!(
            "[filepriv-rust] Download preparado: {} bytes decifrados, de {}:{} ('{}').",
            conteudo.len(),
            req.host,
            req.porta,
            req.nome_remoto
        );

        const TAMANHO_PEDACO: usize = 64 * 1024;
        let pedacos: Vec<Result<PedacoArquivo, Status>> = conteudo
            .chunks(TAMANHO_PEDACO)
            .map(|c| Ok(PedacoArquivo { pedaco: c.to_vec() }))
            .collect();

        let fluxo = tokio_stream::iter(pedacos);
        Ok(Response::new(Box::pin(fluxo)))
    }

    async fn excluir_arquivo(
        &self,
        request: Request<SolicitacaoExclusao>,
    ) -> Result<Response<RespostaExclusao>, Status> {
        let req = request.into_inner();

        if req.usuario_ssh.is_empty() || req.chave_privada.is_empty() || req.diretorio_remoto.is_empty()
        {
            return Ok(Response::new(RespostaExclusao {
                sucesso: false,
                mensagem_erro: "Credenciais de conexão não informadas pelo Node.".into(),
            }));
        }

        let conexao = ConexaoServidor {
            host: req.host.clone(),
            porta: req.porta as u16,
            usuario_ssh: req.usuario_ssh.clone(),
            chave_privada: req.chave_privada.clone(),
            diretorio_remoto: req.diretorio_remoto.clone(),
        };

        // A exclusão na VM é o que precisa dar certo de verdade — é onde o
        // dado sensível de fato vive. Só depois disso confirmado é que
        // mexemos na chave no S3 (best-effort, ver s3_keys.rs).
        if let Err(e) = apagar_de_servidor(conexao, req.nome_remoto.clone()).await {
            return Ok(Response::new(RespostaExclusao {
                sucesso: false,
                mensagem_erro: format!(
                    "Falha ao apagar arquivo em {}:{}: {e}",
                    req.host, req.porta
                ),
            }));
        }

        if !req.chave_referencia.is_empty() {
            if let Err(e) = apagar_chave(&req.chave_referencia).await {
                eprintln!(
                    "[filepriv-rust] Aviso: falha ao apagar chave órfã no S3 ({}): {e}",
                    req.chave_referencia
                );
            }
        }

        println!(
            "[filepriv-rust] Arquivo '{}' excluído de {}:{}.",
            req.nome_remoto, req.host, req.porta
        );

        Ok(Response::new(RespostaExclusao {
            sucesso: true,
            mensagem_erro: String::new(),
        }))
    }
}