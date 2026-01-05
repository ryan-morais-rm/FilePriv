const ServerNode = require('../models/ServerNode');

/**
 * Controller responsável pelo monitoramento e gestão dos nós de armazenamento.
 */
exports.getAllNodes = async (req, res) => {
    try {
        // Aqui leríamos do db.json ou consultariamos o status real via ping
        const nodes = [
            new ServerNode('1', 'NODE-01-Storage', '10.0.10.10', 30120, 'VMware', { cpu: 4, ram: 8, disk: '100 GB' }),
            new ServerNode('2', 'NODE-02-Distribution', '10.0.10.11', 30210, 'VMware', { cpu: 2, ram: 4, disk: '50 GB' }),
            new ServerNode('3', 'NODE-03-Test', '10.0.10.12', 30120, 'VirtualBox', { cpu: 1, ram: 2, disk: '80 GB' })
        ];

        res.status(200).json(nodes);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar status dos servidores." });
    }
};

exports.updateNodeSpecs = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const { cpu, ram, disk } = req.body;

        console.log(`Atualizando especificações do Nó ${nodeId}: CPU=${cpu}, RAM=${ram}`);

        // Lógica de atualização no DB iria aqui
        
        res.status(200).json({
            message: `Especificações do nó ${nodeId} atualizadas com sucesso.`,
            updatedSpecs: { cpu, ram, disk }
        });

    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar nó." });
    }
};