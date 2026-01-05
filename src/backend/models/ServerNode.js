/**
 * Classe que representa um Nó de Armazenamento (VM) na infraestrutura.
 */
class ServerNode {
    constructor(id, name, ip, port, virtualizer, specs = {}) {
        this.id = id;
        this.name = name;           // Ex: NODE-01-Storage
        this.ip = ip;               // Ex: 10.0.10.10
        this.port = port || 8080;
        this.virtualizer = virtualizer; // Ex: VMware, VirtualBox
        this.status = 'Online';     // Online, Offline, Maintenance
        
        // Especificações de Hardware
        this.specs = {
            cpu: specs.cpu || 1,        // vCores
            ram: specs.ram || 2,        // GB
            diskTotal: specs.disk || '100 GB',
            diskUsed: '0 GB'            // Atualizado dinamicamente
        };
        
        this.currentLoad = '0%';    // Carga simulada da CPU
    }

    updateStatus(newStatus) {
        const validStatuses = ['Online', 'Offline', 'Maintenance'];
        if (validStatuses.includes(newStatus)) {
            this.status = newStatus;
        }
    }

    updateLoad(percentage) {
        this.currentLoad = `${percentage}%`;
    }
}

module.exports = ServerNode;