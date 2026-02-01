use std::net::TcpStream;
use std::path::Path;
use std::fs::File;
use std::io::{Read, Write};
use ssh2::Session;

pub struct SSHClient {
    session: Session,
}

impl SSHClient {
    // Conecta e Autentica via Chave Pública
    pub fn connect(ipv4: &str, port: u16, user: &str, key_path: &Path) -> Result<Self, String> {
        let tcp = TcpStream::connect(format!("{}:{}", ipv4, port))
            .map_err(|e| format!("Falha TCP em {}: {}", ipv4, e))?;

        let mut session = Session::new().map_err(|e| e.to_string())?;
        
        session.set_tcp_stream(tcp);
        
        session.handshake().map_err(|e| format!("Falha Handshake: {}", e))?;
        
        session.userauth_pubkey_file(user, None, key_path, None)
            .map_err(|e| format!("Falha de Autenticação para {}: {}", user, e))?;

        
        if !session.authenticated() {
            return Err("Autenticação rejeitada pelo servidor.".to_string());
        }

        Ok(Self { session })
    }

    pub fn send_file(&self, local_path: &Path, remote_filename: &str) -> Result<(), String> {
        let sftp = self.session.sftp()
            .map_err(|e| format!("Falha ao iniciar SFTP: {}", e))?;

        let remote_path = Path::new("uploads").join(remote_filename);        
        
        let mut remote_file = sftp.create(&remote_path)
            .map_err(|e| format!("Não foi possível criar arquivo remoto {:?}: {}", remote_path, e))?;
        
        let mut local_file = File::open(local_path)
            .map_err(|e| format!("Erro ao ler arquivo local: {}", e))?;]
        
        std::io::copy(&mut local_file, &mut remote_file)
            .map_err(|e| format!("Erro durante transferência de dados: {}", e))?;

        Ok(())
    }
}