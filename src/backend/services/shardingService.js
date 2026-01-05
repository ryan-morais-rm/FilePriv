/**
 * Serviço responsável por dividir (sharding) e reconstruir arquivos.
 */
class ShardingService {
    constructor() {
        // Tamanho padrão do pedaço (Chunk): 1MB (simulação)
        // Em produção, isso poderia ser dinâmico ou maior.
        this.CHUNK_SIZE = 1024 * 1024; 
    }

    /**
     * Divide um buffer em múltiplos pedaços.
     * @param {Buffer} fileBuffer - O buffer completo do arquivo.
     * @returns {Array<Buffer>} Um array de buffers (shards).
     */
    split(fileBuffer) {
        const shards = [];
        const totalSize = fileBuffer.length;
        let offset = 0;

        while (offset < totalSize) {
            const end = Math.min(offset + this.CHUNK_SIZE, totalSize);
            const chunk = fileBuffer.subarray(offset, end);
            shards.push(chunk);
            offset = end;
        }

        console.log(`Arquivo dividido em ${shards.length} fragmentos de até ${this.CHUNK_SIZE} bytes.`);
        return shards;
    }

    /**
     * Reconstrói o arquivo original juntando os pedaços.
     * @param {Array<Buffer>} shards - Array de buffers ordenados.
     * @returns {Buffer} O buffer completo reconstruído.
     */
    join(shards) {
        return Buffer.concat(shards);
    }
}

module.exports = new ShardingService();