// src/config.rs

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use dotenv::dotenv;
use rand::RngCore;

pub struct AppConfig {
    pub watch_folder: String,
    pub chunk_size: usize,
    pub master_key: [u8; 32],      
    pub ssh_user: String,
    pub ssh_port: u16,             // Adicionado: Porta explícita
    pub ssh_key_path: PathBuf,     
    pub node_ips: Vec<String>,     
}

impl AppConfig {
    pub fn load() -> Result<Self, String> {
        dotenv().ok();

        let watch_folder = env::var("WATCH_FOLDER")
            .unwrap_or_else(|_| String::from("../uploads"));

        let chunk_size_mb = env::var("CHUNK_SIZE_MB")
            .unwrap_or_else(|_| "10".to_string())
            .parse::<usize>()
            .map_err(|_| "CHUNK_SIZE_MB deve ser um número inteiro")?;
        
        let chunk_size = chunk_size_mb * 1024 * 1024;

        let ssh_user = env::var("SSH_USER").unwrap_or_else(|_| String::from("vagrant"));
        
        let ssh_port = env::var("SSH_PORT")
            .unwrap_or_else(|_| "22".to_string())
            .parse::<u16>()
            .map_err(|_| "SSH_PORT deve ser um número inteiro (u16)")?;

        let ssh_key_str = env::var("SSH_KEY_PATH").unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|p| p.join(".ssh/id_rsa").to_string_lossy().to_string())
                .unwrap_or_else(|| String::from("id_rsa"))
        });
        let ssh_key_path = PathBuf::from(ssh_key_str);

        if !ssh_key_path.exists() {
            println!(">> AVISO: Chave SSH não encontrada em {:?}", ssh_key_path);
        }

        let nodes_str = env::var("NODES")
            .unwrap_or_else(|_| String::from("192.168.60.10,192.168.60.11,192.168.60.12"));
            
        let node_ips: Vec<String> = nodes_str
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        let master_key = Self::load_or_create_master_key("storage_master.key")?;

        Ok(Self {
            watch_folder,
            chunk_size,
            master_key,
            ssh_user,
            ssh_port, 
            ssh_key_path,
            node_ips,
        })
    }
    
    fn load_or_create_master_key(filename: &str) -> Result<[u8; 32], String> {
        let path = Path::new(filename);

        if path.exists() {
            println!(">> Carregando chave existente de: {:?}", path);
            let hex_string = fs::read_to_string(path)
                .map_err(|e| format!("Erro ao ler arquivo de chave: {}", e))?;
            
            let trimmed = hex_string.trim();
            let bytes = hex::decode(trimmed)
                .map_err(|e| format!("Arquivo de chave corrompido: {}", e))?;

            if bytes.len() != 32 {
                return Err("A chave no arquivo não tem 32 bytes (256 bits).".to_string());
            }

            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            Ok(key)
        } else {
            println!(">> Nenhuma chave encontrada. Gerando nova 'master.key'...");
            
            let mut key = [0u8; 32];
            let mut rng = rand::thread_rng();
            rng.fill_bytes(&mut key);

            let hex_string = hex::encode(key);
            fs::write(path, hex_string)
                .map_err(|e| format!("Falha ao salvar nova chave no disco: {}", e))?;

            println!(">> NOVA CHAVE SALVA! Não a perca, ou os arquivos serão irrecuperáveis.");
            Ok(key)
        }
    }
}
