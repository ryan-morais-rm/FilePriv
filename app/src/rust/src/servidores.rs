use crate::proto::filepriv::ServidorCandidato;

/// Config completa de conexão SFTP de um servidor de armazenamento.
/// TODO: hoje isso é chumbado aqui. Vai ser substituído pelo fluxo de
/// "Descobrir Servidores" (IP/porta/hostname configurados pelo usuário no
/// homepage.html após login).
#[derive(Debug, Clone)]
pub struct ServidorConfig {
    pub id: i32,
    pub host: String,
    pub porta_ssh: u16,
    pub usuario_ssh: String,
    pub caminho_chave_privada: String,
    pub caminho_chave_publica: String,
    pub diretorio_remoto: String,
}

/// Dados chumbados temporariamente — substituir pelo fluxo real de
/// descoberta de servidores assim que o frontend/backend disso existir.
pub fn servidores_configurados() -> Vec<ServidorConfig> {
    vec![
        ServidorConfig {
            id: 1,
            host: "10.0.0.10".into(),
            porta_ssh: 22,
            usuario_ssh: "ec2-user".into(),
            caminho_chave_privada: "/etc/filepriv/chaves_ssh/id_rsa".into(),
            caminho_chave_publica: "/etc/filepriv/chaves_ssh/id_rsa.pub".into(),
            diretorio_remoto: "/home/ec2-user/armazenamento".into(),
        },
    ]
}

/// Escolhe o servidor com menos arquivos armazenados.
pub fn escolher_servidor_menos_carregado(
    candidatos: &[ServidorCandidato],
) -> Option<&ServidorCandidato> {
    candidatos.iter().min_by_key(|s| s.arquivos_armazenados)
}

/// Busca a config de conexão SFTP correspondente ao id escolhido.
/// Ver TODO acima: por enquanto é uma tabela local separada da lista que
/// o Node manda.
pub fn buscar_config_por_id(id: i32) -> Option<ServidorConfig> {
    servidores_configurados().into_iter().find(|s| s.id == id)
}