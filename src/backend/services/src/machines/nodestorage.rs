// O struct que representa a VM e usa o sftp_client

use super::ssh_client::SSHClient;
use std::path::Path;

pub struct StorageNode {
    pub id: u8,
    pub port: u16,
    pub ipv4: String,
    pub user: String,
    client: Option<SSHClient>, 
}

impl StorageNode {
    pub fn new(id: u8, ipv4: String, port: u16, user: String) -> Self {
        todo!()
    }

    pub fn is_online(&self) -> bool {
        todo!()
    }

    pub fn try_connect(&mut self) -> Result<(), String> {
        todo!()
    }

    pub fn store_fragment(&mut self, local_path: &Path) -> Result<(), String> {
        todo!()
    }
}