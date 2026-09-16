use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm,
};

/// Cifra o conteúdo com AES-256-GCM, usando uma chave e um nonce gerados
/// na hora (um por arquivo). Retorna (blob pronto pra gravar = nonce ||
/// ciphertext, chave gerada).
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

/// Reverte `cifrar_arquivo`: separa o nonce (12 primeiros bytes) do
/// ciphertext, e descriptografa com a chave buscada no S3.
pub fn descriptografar_arquivo(blob: &[u8], chave_bytes: &[u8]) -> Result<Vec<u8>, String> {
    if chave_bytes.len() != 32 {
        return Err(format!(
            "Chave com tamanho inesperado: {} bytes (esperado 32).",
            chave_bytes.len()
        ));
    }
    if blob.len() < 12 {
        return Err("Blob cifrado menor que o nonce esperado (12 bytes) — dado corrompido.".into());
    }

    let chave = aes_gcm::Key::<Aes256Gcm>::from_slice(chave_bytes);
    let cifra = Aes256Gcm::new(chave);

    let (nonce_bytes, ciphertext) = blob.split_at(12);
    let nonce = aes_gcm::Nonce::from_slice(nonce_bytes);

    cifra
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Falha ao descriptografar (chave incorreta ou dado corrompido): {e}"))
}