const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

/**
 * Serviço responsável por distribuir os fragmentos nos "Nós" de armazenamento.
 * Simula a conexão com VMs salvando em diretórios locais distintos.
 */
class StorageService {
    constructor() {
        // Define os diretórios que simulam os servidores virtuais
        this.nodes = [
            path.join(__dirname, '../../nodes_data/NODE-01'),
            path.join(__dirname, '../../nodes_data/NODE-02'),
            path.join(__dirname, '../../nodes_data/NODE-03')
        ];

        // Garante que as pastas dos nós existam
        this.nodes.forEach(dir => {
            if (!fsSync.existsSync(dir)) {
                fsSync.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Distribui os shards entre os nós disponíveis (Round-Robin).
     * @param {Array<Buffer>} shards - Lista de fragmentos do arquivo.
     * @param {string} fileId - ID único do arquivo para nomear os shards.
     * @returns {Promise<Array>} Lista de metadados de onde cada shard foi salvo.
     */
    async distribute(shards, fileId) {
        const locations = [];

        for (let i = 0; i < shards.length; i++) {
            // Escolhe o nó de forma circular (Node 1 -> Node 2 -> Node 3 -> Node 1...)
            const nodeIndex = i % this.nodes.length;
            const nodePath = this.nodes[nodeIndex];
            const shardName = `${fileId}_part_${i}.enc`; // Extensão .enc para indicar encriptado
            
            const fullPath = path.join(nodePath, shardName);

            // Salva o arquivo no "servidor"
            await fs.writeFile(fullPath, shards[i]);

            locations.push({
                shardIndex: i,
                nodeId: `NODE-0${nodeIndex + 1}`, // ID lógico do nó
                path: fullPath,
                size: shards[i].length
            });
        }

        console.log(`Distribuição concluída: ${shards.length} fragmentos salvos em ${this.nodes.length} nós.`);
        return locations;
    }

    /**
     * Recupera os shards dos nós para reconstrução.
     * @param {Array} shardLocations - Metadados de localização dos shards.
     * @returns {Promise<Array<Buffer>>} Lista de buffers ordenados.
     */
    async retrieve(shardLocations) {
        // Ordena por índice para garantir a reconstrução correta
        const sortedLocations = shardLocations.sort((a, b) => a.shardIndex - b.shardIndex);
        
        const shards = [];
        
        for (const loc of sortedLocations) {
            try {
                const buffer = await fs.readFile(loc.path);
                shards.push(buffer);
            } catch (error) {
                throw new Error(`Falha ao ler fragmento no nó ${loc.nodeId}: ${error.message}`);
            }
        }

        return shards;
    }
}

module.exports = new StorageService();