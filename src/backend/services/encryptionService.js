const crypto = require('crypto');

/**
 * Serviço responsável pela criptografia e descriptografia de arquivos.
 * Utiliza o algoritmo AES-256-GCM (Autenticado).
 */
class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
    }

    /**
     * Gera uma chave de criptografia aleatória (32 bytes) e um IV (12 bytes).
     */
    generateKeyAndIV() {
        return {
            key: crypto.randomBytes(32), // 256 bits
            iv: crypto.randomBytes(12)   // 96 bits (Padrão GCM)
        };
    }

    /**
     * Criptografa um buffer de dados.
     * @param {Buffer} buffer - O conteúdo do arquivo.
     * @returns {Object} Objeto contendo o buffer criptografado, a chave, o IV e a tag de autenticação.
     */
    encrypt(buffer) {
        const { key, iv } = this.generateKeyAndIV();
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);

        const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return {
            encryptedData: encrypted,
            key: key.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Descriptografa um buffer de dados.
     * @param {Buffer} encryptedBuffer - O conteúdo criptografado.
     * @param {string} keyHex - A chave em hexadecimal.
     * @param {string} ivHex - O IV em hexadecimal.
     * @param {string} authTagHex - A tag de autenticação em hexadecimal.
     * @returns {Buffer} O conteúdo original descriptografado.
     */
    decrypt(encryptedBuffer, keyHex, ivHex, authTagHex) {
        const key = Buffer.from(keyHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
        return decrypted;
    }
}

module.exports = new EncryptionService();