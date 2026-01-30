// Lógica de quebrar e reconstruir o arquivo

use std::path::{Path, PathBuf};
use std::fs::File; 

pub struct ShardFragment {
    pub index: usize,         
    pub original_file: String,
    pub path: PathBuf,        
    pub hash: String,         
}

pub struct FileSplitter {
    chunk_size_bytes: usize, 
}

impl FileSplitter {
    pub fn new(chunk_size_mb: usize) -> Self {
        todo!() 
    }

    // Retorna um File handle ou um buffer de bytes
    fn read_chunk(&self, file: &mut File) -> Result<Vec<u8>, String> { 
        // Lê X bytes do arquivo baseado no chunk_size_bytes
        todo!()
    }

    // Recebe os dados (bytes) e escreve os bytes num arquivo temporário e retorna o caminho criado
    fn write_temporary_shard(file_id: &str, index: usize, data: &[u8]) -> Result<PathBuf, String> {
        todo!() 
    }

    // Recebe os dados para calcular o hash
    fn calculate_sha256(data: &[u8]) -> String {
        todo!()
    }

    // Divide o arquivo e retorna um vetor de fragmentos
    pub fn split(&self, file_path: &Path) -> Result<Vec<ShardFragment>, String> {
        // Gerar um ID único ou usar o nome do arquivo
        // Passar esse ID para o write_temporary_shard
        todo!()
    }
}


pub struct FileAssembler; 

impl FileAssembler {
    pub fn new() -> Self {
        Self 
    }

    // Recebe a lista para validar
    fn validate_fragments_order(fragments: &Vec<ShardFragment>) -> Result<(), String> {
        todo!()
    }

    // Lê o arquivo final e gera hash
    fn calculate_final_hash(path: &Path) -> Result<String, String> {
        todo!()
    }

    // Recebe os fragmentos e onde salvar
    pub fn merge(&self, fragments: Vec<ShardFragment>, output_path: &Path) -> Result<(), String> {
        // verificar se o hash de cada fragmento ainda bate com o hash salvo na struct, 
        // para garantir que o pedaço não corrompeu no disco.
        todo!()
    }
}