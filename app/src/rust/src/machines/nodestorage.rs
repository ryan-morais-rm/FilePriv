// O struct que representa a VM e usa o sftp_client

use super::ssh_client::SSHClient;
use std::path::{Path, PathBuf};

pub struct StorageNode {
    pub id: u8,
    pub ipv4: String,
    pub port: u16,
    pub user: String,
    ssh_key_path: PathBuf, // Necessário para reconexão
    client: Option<SSHClient>, 
}

impl StorageNode {
    pub fn new(id: u8, ipv4: String, port: u16, user: String, ssh_key_path: PathBuf) -> Self {
        Self {
            id,
            ipv4,
            port,
            user,
            ssh_key_path,
            client: None, // Nasce desconectado
        }
    }

    pub fn is_online(&self) -> bool {
        self.client.is_some()
    }

    pub fn try_connect(&mut self) -> Result<(), String> {
        if self.is_online() {
            return Ok(());
        }

        println!("Conectando ao Node {} ({})...", self.id, self.ipv4);
        
        let client = SSHClient::connect(
            &self.ipv4, 
            self.port, 
            &self.user, 
            &self.ssh_key_path
        )?;

        self.client = Some(client);
        Ok(())
    }

    pub fn store_fragment(&mut self, local_path: &Path) -> Result<(), String> {
        if !self.is_online() {
            self.try_connect()?;
        }

        let client = self.client.as_ref().unwrap();
        
        let file_name = local_path.file_name()
            .ok_or("Arquivo sem nome")?
            .to_str()
            .ok_or("Nome de arquivo inválido")?;

        match client.send_file(local_path, file_name) {
            Ok(_) => Ok(()),
            Err(e) => {
                self.client = None; 
                Err(format!("Falha no envio para {}: {}", self.ipv4, e))
            }
        }
    }
}