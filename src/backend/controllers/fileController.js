const FileMetadata = require('../models/FileMetadata');
// Importaremos os services futuramente:
// const encryptionService = require('../services/encryptionService');
// const storageService = require('../services/storageService');

/**
 * Controller responsável pelo upload, download e listagem de arquivos.
 */
exports.uploadFile = async (req, res) => {
    try {
        const { fileName, description, ownerId } = req.body;
        // O arquivo binário viria em req.file ou req.files (usando multer)

        // 1. Validação
        if (!fileName || !ownerId) {
            return res.status(400).json({ error: "Nome do arquivo e ID do proprietário são obrigatórios." });
        }

        console.log(`Iniciando processo de upload para: ${fileName}`);

        // 2. Orquestração dos Serviços (O Garçom manda para a Cozinha)
        // const encryptedData = await encryptionService.encrypt(req.file.buffer);
        // const shards = await shardingService.split(encryptedData);
        // const locations = await storageService.distribute(shards);

        // 3. Criação do Metadado (A Ficha Técnica)
        const newFile = new FileMetadata(
            Date.now().toString(),
            fileName,
            fileName, // originalName
            1024, // size simulado
            description,
            ownerId
        );

        // Simulando que foi criptografado e salvo
        newFile.setEncrypted(true);
        newFile.addShardLocation('NODE-01', '/var/data/shard_1.enc');
        newFile.addShardLocation('NODE-02', '/var/data/shard_2.enc');

        // 4. Resposta
        res.status(201).json({
            message: "Arquivo enviado, criptografado e distribuído com sucesso.",
            file: newFile
        });

    } catch (error) {
        console.error("Erro no upload:", error);
        res.status(500).json({ error: "Falha no processamento do arquivo." });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const { userId } = req.params; // ou req.query
        
        // Simulação de busca no banco
        const mockFiles = [
            new FileMetadata('1', 'Relatorio.pdf', 'Relatorio.pdf', 5000, 'Mensal', userId),
            new FileMetadata('2', 'Backup.zip', 'Backup.zip', 20000, 'DB Backup', userId)
        ];

        res.status(200).json(mockFiles);
    } catch (error) {
        res.status(500).json({ error: "Erro ao listar arquivos." });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        console.log(`Solicitação de download para o arquivo ID: ${fileId}`);

        // Fluxo reverso:
        // 1. Buscar metadados no DB
        // 2. Buscar fragmentos nos Nodes (StorageService)
        // 3. Reconstruir e Descriptografar (EncryptionService)
        // 4. Enviar para o cliente

        res.status(200).send("Simulação: Arquivo binário retornado.");
    } catch (error) {
        res.status(500).json({ error: "Erro ao recuperar arquivo." });
    }
};