const db = require('../config/db');

/**
 * Classe que representa um Usuário no sistema FilePriv e interage com o PostgreSQL.
 */
class User {
    // O construtor agora aceita um objeto (row do banco) ou parâmetros individuais
    constructor({ id, name, email, password, state, phone, institution, created_at }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password; 
        this.state = state || '';
        this.phone = phone || '';
        this.institution = institution || '';
        this.createdAt = created_at; // Mapeia do Postgres (snake_case) para JS (camelCase)
    }

    /**
     * Salva um novo usuário no banco de dados.
     * @param {Object} userData - Dados do usuário (name, email, password, etc).
     * @returns {Promise<User>} A instância do usuário criado.
     */
    static async create(userData) {
        const { name, email, password, state, phone, institution } = userData;

        const queryText = `
            INSERT INTO users (name, email, password, state, phone, institution)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        
        const values = [name, email, password, state, phone, institution];

        try {
            const { rows } = await db.query(queryText, values);
            // Retorna uma nova instância da classe com os dados do banco
            return new User(rows[0]);
        } catch (error) {
            throw error; // O Controller vai tratar o erro (ex: email duplicado)
        }
    }

    /**
     * Busca um usuário pelo email (Útil para Login).
     * @param {string} email 
     * @returns {Promise<User|null>} Retorna o usuário ou null se não encontrar.
     */
    static async findByEmail(email) {
        const queryText = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await db.query(queryText, [email]);

        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    /**
     * Busca um usuário pelo ID.
     * @param {number|string} id 
     */
    static async findById(id) {
        const queryText = 'SELECT * FROM users WHERE id = $1';
        const { rows } = await db.query(queryText, [id]);

        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    // Remove a senha ao converter para JSON (Segurança)
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            state: this.state,
            phone: this.phone,
            institution: this.institution,
            createdAt: this.createdAt
        };
    }
}

module.exports = User;