/**
 * Classe que representa um Usuário no sistema FilePriv.
 */
class User {
    constructor(id, name, email, password, state, phone, institution) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password; // Em produção, isso deve ser o Hash da senha, nunca texto puro
        this.state = state || '';
        this.phone = phone || '';
        this.institution = institution || '';
        this.createdAt = new Date().toISOString();
    }

    // Método simples para validação básica
    isValid() {
        if (!this.name || !this.email || !this.password) {
            return false;
        }
        return true;
    }

    // Remove a senha ao converter para JSON (Segurança para não enviar a senha no retorno da API)
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