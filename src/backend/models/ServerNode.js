const db = require('../config/dbconfig');

/**
 * Classe que representa um Nó de Armazenamento (VM) e interage com o PostgreSQL.
 */
class ServerNode {
    // Construtor mapeia os dados crus do Banco (snake_case) para a estrutura do Objeto (camelCase)
    constructor({ id, name, ip, port, cpu_cores, ram_gb, disk_total, status }) {
        this.id = id;
        this.name = name;
        this.ip = ip;
        this.port = port;
        this.status = status;
        
        // Agrupamos as especificações para manter compatibilidade com o Frontend existente
        this.specs = {
            cpu: cpu_cores,
            ram: ram_gb,
            diskTotal: disk_total,
            diskUsed: '0 GB' // Este dado geralmente é dinâmico (tempo real), não salvo no banco estático
        };
    }

    /**
     * Busca todos os servidores cadastrados.
     * @returns {Promise<Array<ServerNode>>}
     */
    static async findAll() {
        const queryText = 'SELECT * FROM server_nodes ORDER BY id ASC';
        try {
            const { rows } = await db.query(queryText);
            return rows.map(row => new ServerNode(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Busca um servidor específico pelo ID.
     */
    static async findById(id) {
        const queryText = 'SELECT * FROM server_nodes WHERE id = $1';
        try {
            const { rows } = await db.query(queryText, [id]);
            if (rows.length === 0) return null;
            return new ServerNode(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cria um novo Nó de Armazenamento no banco.
     * @param {Object} data - Dados do servidor (name, ip, port, specs...)
     */
    static async create({ name, ip, port, cpu, ram, disk }) {
        const queryText = `
            INSERT INTO server_nodes (name, ip, port, cpu_cores, ram_gb, disk_total, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Online')
            RETURNING *;
        `;
        const values = [name, ip, port, cpu, ram, disk];

        try {
            const { rows } = await db.query(queryText, values);
            return new ServerNode(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza as especificações de hardware de um nó.
     * @param {number} cpu - Novos vCores
     * @param {number} ram - Nova RAM em GB
     * @param {string} disk - Novo total de disco
     */
    async updateSpecs(cpu, ram, disk) {
        const queryText = `
            UPDATE server_nodes 
            SET cpu_cores = $1, ram_gb = $2, disk_total = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [cpu, ram, disk, this.id];

        try {
            const { rows } = await db.query(queryText, values);
            // Atualiza a instância local com os novos dados
            this.specs.cpu = rows[0].cpu_cores;
            this.specs.ram = rows[0].ram_gb;
            this.specs.diskTotal = rows[0].disk_total;
            return this;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Atualiza o status do servidor (Online/Offline/Maintenance).
     */
    async updateStatus(newStatus) {
        const validStatuses = ['Online', 'Offline', 'Maintenance'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error("Status inválido.");
        }

        const queryText = 'UPDATE server_nodes SET status = $1 WHERE id = $2 RETURNING status';
        try {
            const { rows } = await db.query(queryText, [newStatus, this.id]);
            this.status = rows[0].status;
            return this.status;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ServerNode;