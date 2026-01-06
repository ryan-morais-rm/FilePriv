const FileMetadata = require('../models/FileMetadata');

/**
 * Controller responsável pelo upload, download e listagem de arquivos.
 * Integrado ao PostgreSQL.
 */
exports.uploadFile = async (req, res) => {
    try {
        // Recebe os dados exatamente como o Frontend (pushFile.js) envia
        const { name, desc } = req.body; 
        
        // Simulação de usuário logado (Futuramente virá do req.user via token)
        const ownerId = 1; 

        if (!name) {
            return res.status(400).json({ error: "Nome do arquivo é obrigatório." });
        }

        console.log(`Iniciando upload no Banco para: ${name}`);

        // 1. Criar o registro principal na tabela 'files'
        const newFile = await FileMetadata.create({
            fileName: name,
            originalName: name, // Em upload real, viria do multer
            size: Math.floor(Math.random() * 10000) + 1000, // Tamanho simulado
            description: desc,
            ownerId: ownerId,
            isEncrypted: true
        });

        // 2. Simular a distribuição dos pedaços (Salvar na tabela 'file_shards')
        // Como newFile é uma instância da classe, podemos chamar seus métodos
        await newFile.addShardLocation('NODE-01', `/mnt/storage/node1/${newFile.id}_part1.enc`, 0);
        await newFile.addShardLocation('NODE-02', `/mnt/storage/node2/${newFile.id}_part2.enc`, 1);

        // 3. Responder ao Frontend
        res.status(201).json({
            message: "Arquivo salvo e distribuído com sucesso!",
            file: newFile
        });

    } catch (error) {
        console.error("Erro no upload:", error);
        res.status(500).json({ error: "Falha ao salvar arquivo no banco de dados." });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const ownerId = 1; // Temporário

        // Busca no Postgres usando o método estático que criamos
        const files = await FileMetadata.findByOwnerId(ownerId);

        // Formata a data e os campos para o Frontend
        const responseData = files.map(file => ({
            id: file.id,
            name: file.fileName,
            desc: file.description,
            // Formata a data do banco para DD/MM/AAAA
            date: new Date(file.uploadDate).toLocaleDateString('pt-BR')
        }));

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro ao listar:", error);
        res.status(500).json({ error: "Erro ao buscar arquivos." });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // 1. Busca metadados e shards no banco
        const file = await FileMetadata.findById(fileId);

        if (!file) {
            return res.status(404).json({ error: "Arquivo não encontrado." });
        }

        console.log(`Download solicitado: ${file.fileName}. Shards localizados: ${file.shards.length}`);

        // Aqui entraria a lógica real de buscar os bytes nos servidores e descriptografar
        // Por enquanto, retornamos o sucesso da operação lógica
        res.status(200).json({ 
            message: "Metadados recuperados com sucesso. Download iniciado (Simulado).",
            fileData: file
        });

    } catch (error) {
        console.error("Erro no download:", error);
        res.status(500).json({ error: "Erro ao recuperar arquivo." });
    }
};