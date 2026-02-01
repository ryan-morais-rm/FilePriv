// O struct que gerencia as VMs 

use super::node::StorageNode;
use crate::files::sharding::{FileSplitter, ShardFragment};
use crate::files::encryption::Encryptor;
use std::path::{Path, PathBuf};
use std::fs;
use std::io::Write;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct ShardRecord {
    index: usize,
    node_ip: String,
    hash_original: String, // Hash do pedaço antes de criptografar
    remote_path: String,
}

#[derive(Serialize, Deserialize)]
struct FileManifest {
    file_name: String,
    total_size: u64,
    total_shards: usize,
    shards: Vec<ShardRecord>,
}

// ----------------------------------------------------

pub struct ShardManager {
    nodes: Vec<StorageNode>,
    splitter: FileSplitter,
    encryptor: Encryptor,
}

impl ShardManager {
    pub fn new(chunk_size: usize, key: &[u8]) -> Self {
        ShardManager {
            nodes: Vec::new(),
            splitter: FileSplitter::new(chunk_size), 
            encryptor: Encryptor::new(key).expect("Chave inválida"), 
        }
    }

    pub fn add_node(&mut self, node: StorageNode) {
        self.nodes.push(node);
    }

    pub async fn process_upload(&mut self, file_path: PathBuf) -> Result<(), String> {
        // Validação inicial
        if self.nodes.is_empty() {
            return Err("Nenhum StorageNode disponível.".to_string());
        }

        let file_name = file_path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        println!("Iniciando processamento de: {}", file_name);

        let fragments = self.splitter.split(&file_path)?;
        
        let mut manifest_records = Vec::new();

        for (i, fragment) in fragments.iter().enumerate() {
            println!("Processando fragmento {}/{}...", i + 1, fragments.len());

            let raw_bytes = fs::read(&fragment.path)
                .map_err(|e| format!("Falha ao ler fragmento: {}", e))?;


            let encrypted_bytes = self.encryptor.encrypt(&raw_bytes)?;
            
            let encrypted_path = fragment.path.with_extension("enc");
            
            let mut enc_file = fs::File::create(&encrypted_path)
                .map_err(|e| format!("Erro ao criar arq temporário encriptado: {}", e))?;
            enc_file.write_all(&encrypted_bytes)
                .map_err(|e| format!("Erro ao escrever bytes encriptados: {}", e))?;

            let node_index = i % self.nodes.len();
            
            let target_node = &mut self.nodes[node_index];
            
            let remote_filename = encrypted_path.file_name().unwrap().to_str().unwrap();
            
            let remote_path = format!("uploads/{}", remote_filename); 

            println!("Envianvo para Node {} ({})", target_node.id, target_node.ipv4);

            target_node.store_fragment(&encrypted_path)
                .map_err(|e| format!("Erro no envio para VM {}: {}", target_node.ipv4, e))?;

            manifest_records.push(ShardRecord {
                index: fragment.index,
                node_ip: target_node.ipv4.clone(),
                hash_original: fragment.hash.clone(),
                remote_path: remote_path,
            });

            let _ = fs::remove_file(encrypted_path);
        }

        let manifest = FileManifest {
            file_name: file_name.clone(),
            total_size: fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0),
            total_shards: fragments.len(),
            shards: manifest_records,
        };

        let json_data = serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("Erro ao gerar JSON: {}", e))?;

        let manifest_path = Path::new("..").join(format!("manifest_{}.json", file_name));
        
        fs::write(&manifest_path, json_data)
            .map_err(|e| format!("Erro ao salvar manifesto: {}", e))?;

        println!("Sucesso! Manifesto salvo em: {:?}", manifest_path);
        Ok(())
    }
}