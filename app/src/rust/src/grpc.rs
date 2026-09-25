use sha2::{Digest, Sha256};
use std::pin::Pin;
use tokio_stream::Stream;
use tonic::{Request, Response, Status, Streaming};
use uuid::Uuid;

use crate::crypto::{cifrar_arquivo, descriptografar_arquivo};
use crate::healthcheck::verificar_todos;
use crate::proto::filepriv::{
    arquivo_chunk_upload::Conteudo,
    metadados_upload::Destino as DestinoUpload,
    processador_arquivo_server::ProcessadorArquivo,
    solicitacao_download::Destino as DestinoDownload,
    solicitacao_exclusao::Destino as DestinoExclusao,
    ArquivoChunkUpload, ConectarProvedorS3Request, ConectarProvedorS3Response, MetadadosUpload,
    PedacoArquivo, RespostaExclusao, RespostaUpload, SalvarCredencialSshRequest,
    SalvarCredencialSshResponse, SolicitacaoDownload, SolicitacaoExclusao,
    VerificarServidoresRequest, VerificarServidoresResponse,
};
use crate::s3_keys::{
    apagar_chave, buscar_chave, buscar_credencial_s3_usuario, buscar_credencial_ssh, salvar_chave,
    salvar_credencial_s3_usuario, salvar_credencial_ssh,
};
use crate::s3_storage::{self, ConexaoS3Externo};
use crate::servidores::escolher_servidor_menos_carregado;
use crate::storage::{apagar_de_servidor, baixar_de_servidor, enviar_para_servidor, ConexaoServidor};

// Mensagem única, por decisão de produto — nunca tentamos distinguir se a
// falha foi AK/SK inválida, bucket inexistente ou região errada.
const ERRO_S3_EXTERNO: &str = "Verifique os status de sua AK/SK no seu painel da AWS ou a região informada.";

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
        armazenado_em_provedor_externo: false,
    }
}

async fn resolver_chave_privada(referencia: &str) -> Result<String, Status> {
    let bytes = buscar_credencial_ssh(referencia)
        .await
        .map_err(Status::internal)?;
    String::from_utf8(bytes).map_err(|_| {
        Status::internal("Credencial SSH armazenada no S3 não é UTF-8 válido (PEM corrompido?).")
    })
}

/// Busca a credencial do usuário no cofre e monta a conexão pronta pra
/// s3_storage, já com a região resolvida (default us-east-1 se vazia).
async fn resolver_conexao_s3_externo(
    bucket: &str,
    credencial_referencia: &str,
    regiao: &str,
) -> Result<ConexaoS3Externo, String> {
    let (access_key, secret_key) = buscar_credencial_s3_usuario(credencial_referencia).await?;

    Ok(ConexaoS3Externo {
        bucket: bucket.to_string(),
        access_key,
        secret_key,
        regiao: s3_storage::regiao_efetiva(regiao),
    })
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

        let Some(destino) = metadados.destino.clone() else {
            return Ok(Response::new(resposta_erro(
                "Nenhum destino de armazenamento informado pelo Node.",
            )));
        };

        // A cifragem acontece sempre, independente do destino escolhido —
        // é o Rust que decide como/onde guardar, mas nunca manda conteúdo
        // em claro pra lugar nenhum.
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

        let chave_referencia = match salvar_chave(chave.as_slice()).await {
            Ok(referencia) => referencia,
            Err(e) => {
                return Ok(Response::new(resposta_erro(format!(
                    "Falha ao salvar a chave de criptografia no S3: {e}"
                ))));
            }
        };

        match destino {
            DestinoUpload::Vm(destino_vm) => {
                let Some(servidor_escolhido) =
                    escolher_servidor_menos_carregado(&destino_vm.servidores_disponiveis).cloned()
                else {
                    return Ok(Response::new(resposta_erro(
                        "Nenhum servidor disponível informado pelo Node.",
                    )));
                };

                if destino_vm.usuario_ssh.is_empty()
                    || destino_vm.chave_privada_referencia.is_empty()
                    || destino_vm.diretorio_remoto.is_empty()
                {
                    return Ok(Response::new(resposta_erro(
                        "Credenciais de conexão (usuario_ssh/chave_privada_referencia/diretorio_remoto) não foram informadas pelo Node.",
                    )));
                }

                let chave_privada =
                    match resolver_chave_privada(&destino_vm.chave_privada_referencia).await {
                        Ok(valor) => valor,
                        Err(status) => {
                            return Ok(Response::new(resposta_erro(format!(
                                "Falha ao buscar credencial SSH no S3: {}",
                                status.message()
                            ))));
                        }
                    };

                let conexao = ConexaoServidor {
                    host: servidor_escolhido.host.clone(),
                    porta: servidor_escolhido.porta as u16,
                    usuario_ssh: destino_vm.usuario_ssh.clone(),
                    chave_privada,
                    diretorio_remoto: destino_vm.diretorio_remoto.clone(),
                };

                let host_exibicao = conexao.host.clone();
                let porta_exibicao = conexao.porta;

                if let Err(e) = enviar_para_servidor(conexao, nome_remoto.clone(), blob_cifrado).await
                {
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
                    armazenado_em_provedor_externo: false,
                }))
            }

            DestinoUpload::S3Externo(destino_s3) => {
                let conexao = match resolver_conexao_s3_externo(
                    &destino_s3.bucket,
                    &destino_s3.credencial_referencia,
                    &destino_s3.regiao,
                )
                .await
                {
                    Ok(c) => c,
                    Err(_) => return Ok(Response::new(resposta_erro(ERRO_S3_EXTERNO))),
                };

                if let Err(_) = s3_storage::enviar(&conexao, &nome_remoto, blob_cifrado).await {
                    return Ok(Response::new(resposta_erro(ERRO_S3_EXTERNO)));
                }

                println!(
                    "[filepriv-rust] Arquivo '{}' ({} bytes cifrados) do usuário {} enviado ao S3 externo (bucket '{}') como '{}'. Chave salva em '{}' (fingerprint: {}...).",
                    metadados.nome_arquivo, tamanho, metadados.usuario_id,
                    conexao.bucket, nome_remoto, chave_referencia, fingerprint_chave
                );

                Ok(Response::new(RespostaUpload {
                    sucesso: true,
                    mensagem_erro: String::new(),
                    chave_referencia,
                    servidor_id: 0,
                    tamanho,
                    hash,
                    nome_remoto,
                    armazenado_em_provedor_externo: true,
                }))
            }
        }
    }

    async fn verificar_servidores(
        &self,
        request: Request<VerificarServidoresRequest>,
    ) -> Result<Response<VerificarServidoresResponse>, Status> {
        let req = request.into_inner();
        let chave_privada = resolver_chave_privada(&req.chave_privada_referencia).await?;
        let resposta = verificar_todos(req, chave_privada).await;
        Ok(Response::new(resposta))
    }

    type BaixarArquivoStream =
        Pin<Box<dyn Stream<Item = Result<PedacoArquivo, Status>> + Send + 'static>>;

    async fn baixar_arquivo(
        &self,
        request: Request<SolicitacaoDownload>,
    ) -> Result<Response<Self::BaixarArquivoStream>, Status> {
        let req = request.into_inner();

        if req.nome_remoto.is_empty() || req.chave_referencia.is_empty() {
            return Err(Status::invalid_argument(
                "nome_remoto e chave_referencia são obrigatórios.",
            ));
        }

        let Some(destino) = req.destino else {
            return Err(Status::invalid_argument(
                "Nenhum destino de armazenamento informado pelo Node.",
            ));
        };

        let chave_bytes = buscar_chave(&req.chave_referencia)
            .await
            .map_err(Status::internal)?;

        let blob_cifrado = match destino {
            DestinoDownload::Vm(destino_vm) => {
                if destino_vm.usuario_ssh.is_empty()
                    || destino_vm.chave_privada_referencia.is_empty()
                    || destino_vm.diretorio_remoto.is_empty()
                {
                    return Err(Status::invalid_argument(
                        "Credenciais de conexão não informadas pelo Node.",
                    ));
                }

                let chave_privada =
                    resolver_chave_privada(&destino_vm.chave_privada_referencia).await?;

                let conexao = ConexaoServidor {
                    host: destino_vm.host.clone(),
                    porta: destino_vm.porta as u16,
                    usuario_ssh: destino_vm.usuario_ssh.clone(),
                    chave_privada,
                    diretorio_remoto: destino_vm.diretorio_remoto.clone(),
                };

                baixar_de_servidor(conexao, req.nome_remoto.clone())
                    .await
                    .map_err(|e| Status::internal(e.to_string()))?
            }
            DestinoDownload::S3Externo(destino_s3) => {
                let conexao = resolver_conexao_s3_externo(
                    &destino_s3.bucket,
                    &destino_s3.credencial_referencia,
                    &destino_s3.regiao,
                )
                .await
                .map_err(|_| Status::internal(ERRO_S3_EXTERNO))?;

                s3_storage::baixar(&conexao, &req.nome_remoto)
                    .await
                    .map_err(|_| Status::internal(ERRO_S3_EXTERNO))?
            }
        };

        let conteudo = descriptografar_arquivo(&blob_cifrado, &chave_bytes)
            .map_err(Status::internal)?;

        println!(
            "[filepriv-rust] Download preparado: {} bytes decifrados ('{}').",
            conteudo.len(),
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

        let Some(destino) = req.destino else {
            return Ok(Response::new(RespostaExclusao {
                sucesso: false,
                mensagem_erro: "Nenhum destino de armazenamento informado pelo Node.".into(),
            }));
        };

        let resultado_exclusao: Result<(), String> = match &destino {
            DestinoExclusao::Vm(destino_vm) => {
                if destino_vm.usuario_ssh.is_empty()
                    || destino_vm.chave_privada_referencia.is_empty()
                    || destino_vm.diretorio_remoto.is_empty()
                {
                    return Ok(Response::new(RespostaExclusao {
                        sucesso: false,
                        mensagem_erro: "Credenciais de conexão não informadas pelo Node.".into(),
                    }));
                }

                let chave_privada =
                    match resolver_chave_privada(&destino_vm.chave_privada_referencia).await {
                        Ok(valor) => valor,
                        Err(status) => {
                            return Ok(Response::new(RespostaExclusao {
                                sucesso: false,
                                mensagem_erro: format!(
                                    "Falha ao buscar credencial SSH no S3: {}",
                                    status.message()
                                ),
                            }));
                        }
                    };

                let conexao = ConexaoServidor {
                    host: destino_vm.host.clone(),
                    porta: destino_vm.porta as u16,
                    usuario_ssh: destino_vm.usuario_ssh.clone(),
                    chave_privada,
                    diretorio_remoto: destino_vm.diretorio_remoto.clone(),
                };

                apagar_de_servidor(conexao, req.nome_remoto.clone())
                    .await
                    .map_err(|e| e.to_string())
            }
            DestinoExclusao::S3Externo(destino_s3) => {
                match resolver_conexao_s3_externo(
                    &destino_s3.bucket,
                    &destino_s3.credencial_referencia,
                    &destino_s3.regiao,
                )
                .await
                {
                    Ok(conexao) => s3_storage::apagar(&conexao, &req.nome_remoto)
                        .await
                        .map_err(|_| ERRO_S3_EXTERNO.to_string()),
                    Err(_) => Err(ERRO_S3_EXTERNO.to_string()),
                }
            }
        };

        if let Err(mensagem) = resultado_exclusao {
            return Ok(Response::new(RespostaExclusao {
                sucesso: false,
                mensagem_erro: mensagem,
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

        println!("[filepriv-rust] Arquivo '{}' excluído.", req.nome_remoto);

        Ok(Response::new(RespostaExclusao {
            sucesso: true,
            mensagem_erro: String::new(),
        }))
    }

    async fn salvar_credencial_ssh(
        &self,
        request: Request<SalvarCredencialSshRequest>,
    ) -> Result<Response<SalvarCredencialSshResponse>, Status> {
        let req = request.into_inner();

        if req.chave_privada.is_empty() {
            return Ok(Response::new(SalvarCredencialSshResponse {
                sucesso: false,
                mensagem_erro: "Chave privada vazia.".into(),
                chave_privada_referencia: String::new(),
            }));
        }

        match salvar_credencial_ssh(&req.chave_privada).await {
            Ok(referencia) => Ok(Response::new(SalvarCredencialSshResponse {
                sucesso: true,
                mensagem_erro: String::new(),
                chave_privada_referencia: referencia,
            })),
            Err(e) => Ok(Response::new(SalvarCredencialSshResponse {
                sucesso: false,
                mensagem_erro: format!("Falha ao salvar credencial SSH no S3: {e}"),
                chave_privada_referencia: String::new(),
            })),
        }
    }

    async fn conectar_provedor_s3(
        &self,
        request: Request<ConectarProvedorS3Request>,
    ) -> Result<Response<ConectarProvedorS3Response>, Status> {
        let req = request.into_inner();

        if req.bucket.is_empty() || req.access_key.is_empty() || req.secret_key.is_empty() {
            return Ok(Response::new(ConectarProvedorS3Response {
                sucesso: false,
                mensagem_erro: "bucket, access_key e secret_key são obrigatórios.".into(),
                credencial_referencia: String::new(),
                regiao_usada: String::new(),
            }));
        }

        let regiao = s3_storage::regiao_efetiva(&req.regiao);

        let conexao = ConexaoS3Externo {
            bucket: req.bucket.clone(),
            access_key: req.access_key.clone(),
            secret_key: req.secret_key.clone(),
            regiao: regiao.clone(),
        };

        if s3_storage::testar_conexao(&conexao).await.is_err() {
            return Ok(Response::new(ConectarProvedorS3Response {
                sucesso: false,
                mensagem_erro: ERRO_S3_EXTERNO.into(),
                credencial_referencia: String::new(),
                regiao_usada: String::new(),
            }));
        }

        match salvar_credencial_s3_usuario(&req.access_key, &req.secret_key).await {
            Ok(referencia) => {
                println!(
                    "[filepriv-rust] Provedor S3 conectado (bucket '{}', região '{}').",
                    req.bucket, regiao
                );
                Ok(Response::new(ConectarProvedorS3Response {
                    sucesso: true,
                    mensagem_erro: String::new(),
                    credencial_referencia: referencia,
                    regiao_usada: regiao,
                }))
            }
            Err(e) => Ok(Response::new(ConectarProvedorS3Response {
                sucesso: false,
                mensagem_erro: format!("Conexão validada, mas falha ao salvar a credencial no cofre: {e}"),
                credencial_referencia: String::new(),
                regiao_usada: String::new(),
            })),
        }
    }
}