// Wrapper técnico do SFTP
use std::path::Path;

pub struct SSHClient {
    // A sessão mantém a conexão TCP/Criptografia
    session: Option<ssh2::Session>,
}

impl SSHClient {
    // ADICIONADO: 'private_key_path'
    pub fn connect(ipv4: &str, port: u16, user: &str, private_key_path: &Path) -> Result<Self, String> {
        // 1. TcpStream::connect
        // 2. Session::new
        // 3. session.handshake
        // 4. session.userauth_pubkey_file(...)
        todo!()
    }
    
    pub fn send_file(&mut self, local_path: &Path, remote_path: &str) -> Result<(), String> {
        // 1. self.session.sftp() -> Cria o canal SFTP
        // 2. sftp.create(remote_path)
        // 3. Ler arquivo local e escrever no remoto
        todo!()
    }
}