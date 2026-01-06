const ServerNode = require('../models/ServerNode');

/**
 * Controller responsável pelo monitoramento e gestão dos nós de armazenamento.
 */
exports.getAllNodes = async (req, res) => {
    try {
        // Busca todos os nós diretamente do PostgreSQL
        const nodes = await ServerNode.findAll();
        res.status(200).json(nodes);
    } catch (error) {
        console.error("Erro ao buscar nós:", error);
        res.status(500).json({ error: "Erro ao buscar status dos servidores." });
    }
};

exports.updateNodeSpecs = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const { cpu, ram, disk } = req.body;

        // 1. Verifica se o nó existe
        const node = await ServerNode.findById(nodeId);
        
        if (!node) {
            return res.status(404).json({ error: "Nó de armazenamento não encontrado." });
        }

        // 2. Atualiza as especificações no banco
        await node.updateSpecs(cpu, ram, disk);

        console.log(`Especificações do Nó ${nodeId} atualizadas: CPU=${cpu}, RAM=${ram}, Disk=${disk}`);
        
        res.status(200).json({
            message: `Especificações do nó ${node.name} atualizadas com sucesso.`,
            updatedSpecs: node.specs
        });

    } catch (error) {
        console.error("Erro ao atualizar nó:", error);
        res.status(500).json({ error: "Erro interno ao atualizar especificações." });
    }
};

// Adicionar um nó (Opcional, mas útil para popular o banco inicialmente)
exports.createNode = async (req, res) => {
    try {
        const newNode = await ServerNode.create(req.body);
        res.status(201).json(newNode);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar nó." });
    }
};