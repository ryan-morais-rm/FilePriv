use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm,
};

pub fn cifrar_arquivo(
    conteudo: &[u8],
) -> Result<(Vec<u8>, aes_gcm::Key<Aes256Gcm>), aes_gcm::Error> {
    let chave = Aes256Gcm::generate_key(&mut OsRng);
    let cifra = Aes256Gcm::new(&chave);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 96 bits, único por arquivo

    let ciphertext = cifra.encrypt(&nonce, conteudo)?;

    let mut blob = Vec::with_capacity(nonce.len() + ciphertext.len());
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&ciphertext);

    Ok((blob, chave))
}