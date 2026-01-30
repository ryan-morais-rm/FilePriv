// O struct que gerencia as VMs 

use super::node::StorageNode; 
use crate::files::sharding::{FileSplitter, ShardFragment}; 
use crate::files::encryption::Encryptor; 
use std::path::PathBuf;

pub struct ShardManager {
    nodes: Vec<StorageNode>,
    splitter: FileSplitter,
    encryptor: Encryptor,
}

impl ShardManager {
    // O construtor precisa receber as configs para inicializar as ferramentas
    pub fn new(chunk_size: usize, key: &[u8]) -> Self {
        todo!()
    }

    pub fn add_node(&mut self, node: StorageNode) {
        todo!()
    }

    pub async fn process_upload(&mut self, file_path: PathBuf) -> Result<(), String> {
        // Lógica sugerida:
        
        // 1. Quebrar o arquivo
        // let fragments = self.splitter.split(&file_path)?;

        // 2. Loop de distribuição
        // for (i, fragment) in fragments.iter().enumerate() {
            
            // 3. Criptografar o pedaço (ler do disco -> encrypt -> buffer)
            // let encrypted_data = self.encryptor.encrypt(...)?;
            
            // 4. Selecionar VM (Round Robin)
            // Ex: Se tenho 3 VMs e estou no fragmento 0 -> VM 0
            // Fragmento 1 -> VM 1, Fragmento 2 -> VM 2, Fragmento 3 -> VM 0...
            // let node_index = i % self.nodes.len();
            // let target_node = &mut self.nodes[node_index];

            // 5. Enviar
            // target_node.store_fragment(...)
        // }
        
        todo!()
    }
}