// Lógica de criptografia
// Padrão utilizado: AES-256-GCM

pub struct Encryptor {
    key: [u8; 32], 
}

impl Encryptor {
    pub fn new(key_bytes: &[u8]) -> Result<Self, String> {
        todo!()
    }

    // Retorna o array de 12 bytes (u8)
    fn generate_nonce() -> [u8; 12] {
        // Usa uma lib de random (Ex: rand::thread_rng)
        todo!()
    }

    // Retorna (Nonce extraído, Ciphertext puro)
    fn separate_nonce_and_ciphertext(encrypted_data: &[u8]) -> Result<(&[u8], &[u8]), String> {
        // Verifica se o array tem pelo menos 12 bytes
        // Divide o slice em dois: [0..12] e [12..fim]
        todo!()
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        // 1. let nonce = Self::generate_nonce();
        // 2. Instancia o Cipher usando self.key
        // 3. let ciphertext = cipher.encrypt(nonce, data)?;
        // 4. Retorna [nonce + ciphertext] concatenados
        todo!()
    }
    
    pub fn decrypt(&self, encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
        // 1. let (nonce, cipher_text) = Self::separate_nonce_and_ciphertext(encrypted_data)?;
        // 2. Instancia o Cipher usando self.key
        // 3. let plaintext = cipher.decrypt(nonce, cipher_text)?;
        // 4. Retorna plaintext
        todo!()
    }
}