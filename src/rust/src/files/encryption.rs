use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Nonce
};
use rand::Rng; 

pub struct Encryptor {
    key: [u8; 32], 
}

impl Encryptor {
    pub fn new(key_bytes: &[u8]) -> Result<Self, String> {
        if key_bytes.len() != 32 {
            return Err(format!(
                "Tamanho de chave inválido. Esperado 32 bytes, recebido {}.",
                key_bytes.len()
            ));
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(key_bytes);

        Ok(Self { key })
    }

    fn generate_nonce() -> [u8; 12] {
        let mut nonce = [0u8; 12];
        let mut rng = rand::thread_rng();
        rng.fill(&mut nonce);
        nonce
    }

    fn separate_nonce_and_ciphertext(encrypted_data: &[u8]) -> Result<(&[u8], &[u8]), String> {
        if encrypted_data.len() < 12 {
            return Err("Dados corrompidos ou muito curtos (menor que o tamanho do Nonce).".to_string());
        }

        let (nonce, ciphertext) = encrypted_data.split_at(12);
        Ok((nonce, ciphertext))
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        let nonce_bytes = Self::generate_nonce();
        let nonce = Nonce::from_slice(&nonce_bytes); 

        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| format!("Erro ao inicializar Cipher: {}", e))?;

        let ciphertext = cipher.encrypt(nonce, data)
            .map_err(|e| format!("Falha na encriptação: {}", e))?;

        let mut final_package = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        
        final_package.extend_from_slice(&nonce_bytes);
        final_package.extend_from_slice(&ciphertext);

        Ok(final_package)
    }
    
    pub fn decrypt(&self, encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
        let (nonce_bytes, ciphertext_bytes) = Self::separate_nonce_and_ciphertext(encrypted_data)?;

        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| format!("Erro ao inicializar Cipher: {}", e))?;

        let plaintext = cipher.decrypt(nonce, ciphertext_bytes)
            .map_err(|e| format!("Falha na decriptação (Chave errada ou arquivo corrompido): {}", e))?;

        Ok(plaintext)
    }
}