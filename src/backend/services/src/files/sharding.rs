use std::fs::{self, File};
use std::io::{Read, Write, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use sha2::{Sha256, Digest};

#[derive(Debug, Clone)]
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
        Self {
            chunk_size_bytes: chunk_size_mb * 1024 * 1024,
        }
    }

    fn read_chunk(&self, file: &mut File) -> Result<Vec<u8>, String> { 
        let mut buffer = Vec::with_capacity(self.chunk_size_bytes);
        
        let mut handle = file.take(self.chunk_size_bytes as u64);
        
        handle.read_to_end(&mut buffer)
            .map_err(|e| format!("Erro ao ler chunk: {}", e))?;

        Ok(buffer)
    }

    fn write_temporary_shard(file_id: &str, index: usize, data: &[u8]) -> Result<PathBuf, String> {
        let temp_dir = Path::new("temp_shards");
        if !temp_dir.exists() {
            fs::create_dir(temp_dir).map_err(|e| format!("Erro criar pasta temp: {}", e))?;
        }

        let file_name = format!("{}_part_{}.shard", file_id, index);
        let file_path = temp_dir.join(file_name);

        fs::write(&file_path, data)
            .map_err(|e| format!("Erro ao escrever shard temporário: {}", e))?;

        Ok(file_path)
    }

    fn calculate_sha256(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        hex::encode(result)
    }

    pub fn split(&self, file_path: &Path) -> Result<Vec<ShardFragment>, String> {
        let mut file = File::open(file_path)
            .map_err(|e| format!("Arquivo não encontrado: {}", e))?;

        let file_name = file_path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let file_id = file_name.replace(" ", "_"); 

        let mut fragments = Vec::new();
        let mut index = 0;

        loop {
            let data = self::FileSplitter::read_chunk(self, &mut file)?;
            
            if data.is_empty() {
                break;
            }

            let hash = Self::calculate_sha256(&data);
            let shard_path = Self::write_temporary_shard(&file_id, index, &data)?;
            fragments.push(ShardFragment {
                index,
                original_file: file_name.clone(),
                path: shard_path,
                hash,
            });

            index += 1;
        }

        Ok(fragments)
    }
}

// ------------------------------------------------------------------

pub struct FileAssembler; 

impl FileAssembler {
    pub fn new() -> Self {
        Self 
    }

    fn validate_fragments_order(fragments: &Vec<ShardFragment>) -> Result<(), String> {
        let mut sorted_indices: Vec<usize> = fragments.iter().map(|f| f.index).collect();
        sorted_indices.sort();

        for (i, &index) in sorted_indices.iter().enumerate() {
            if i != index {
                return Err(format!("Ordem dos fragmentos inválida. Esperado {}, encontrado {}.", i, index));
            }
        }
        Ok(())
    }

    fn calculate_final_hash(path: &Path) -> Result<String, String> {
        let mut file = File::open(path).map_err(|e| e.to_string())?;
        let mut hasher = Sha256::new();
        std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
        Ok(hex::encode(hasher.finalize()))
    }

    pub fn merge(&self, mut fragments: Vec<ShardFragment>, output_path: &Path) -> Result<(), String> {
        fragments.sort_by_key(|k| k.index);

        Self::validate_fragments_order(&fragments)?;

        let mut output_file = File::create(output_path)
            .map_err(|e| format!("Erro ao criar arquivo final: {}", e))?;

        for fragment in fragments {
            let data = fs::read(&fragment.path)
                .map_err(|e| format!("Erro ao ler fragmento {:?}: {}", fragment.path, e))?;

            let current_hash = FileSplitter::calculate_sha256(&data);

            if current_hash != fragment.hash {
                return Err(format!(
                    "CORRUPÇÃO DETECTADA: O fragmento {} tem hash diferente do registro original.", 
                    fragment.index
                ));
            }
            output_file.write_all(&data)
                .map_err(|e| format!("Erro ao escrever no arquivo final: {}", e))?;
        }
        println!("Arquivo reconstruído com sucesso em: {:?}", output_path);
        Ok(())
    }
}