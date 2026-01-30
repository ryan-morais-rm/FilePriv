// O struct que representa a VM e usa o sftp_client

// Tipo genérico de Erro para o exemplo (pode ser ssh2::Error, std::io::Error, etc)
type MyResult<T> = Result<T, Box<dyn std::error::Error>>;

pub struct StorageNode {
    pub port: u16,
    pub ipv4: String, 
    pub user: String,
    session: Option<Session>, 
}

impl StorageNode {
    pub fn new(ipv4: String, user: String, port: u16) -> Self {
        Self { ipv4, user, port }
    }

    pub async fn connect(&mut self) -> MyResult<()> {
        Ok(())
    }

    pub async fn disconnect(&mut self) -> MyResult<()> {
        Ok(())
    }

    pub async fn upload_shard(&self, local_path: &PathBuf, remote_path: &str) -> MyResult<()> {
        Ok(())
    }
}