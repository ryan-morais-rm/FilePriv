/**
 * Classe que representa os metadados de um arquivo armazenado.
 */
class FileMetadata {
    constructor(id, fileName, originalName, size, description, ownerId) {
        this.id = id;
        this.fileName = fileName;         // Nome salvo no sistema (pode ser um hash)
        this.originalName = originalName; // Nome original do arquivo (ex: relatorio.pdf)
        this.size = size;                 // Tamanho em bytes
        this.description = description || "Sem descrição";
        this.ownerId = ownerId;           // ID do usuário que fez o upload
        this.uploadDate = new Date().toLocaleDateString('pt-BR');
        
        // Array para armazenar onde cada pedaço (shard) do arquivo está guardado
        // Ex: [{ nodeId: 'node-01', path: '/var/data/shard1.enc' }]
        this.shards = []; 
        this.isEncrypted = false;
    }

    addShardLocation(nodeId, path) {
        this.shards.push({ nodeId, path, status: 'active' });
    }

    setEncrypted(status) {
        this.isEncrypted = status;
    }
}

module.exports = FileMetadata;