const User = require('../models/User');

/**
 * Controller responsável pela autenticação e gestão de usuários.
 * Integrado ao PostgreSQL.
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, state, phone, institution } = req.body;

        // 1. Validação básica
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: "Campos obrigatórios (nome, email, senha) estão faltando." 
            });
        }

        // 2. Verificar se o usuário já existe no banco
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: "Este email já está cadastrado." });
        }

        // 3. Criação no Banco de Dados
        // O método create do Model agora executa o INSERT no Postgres
        const newUser = await User.create({
            name, 
            email, 
            password, // Nota: Em produção, você deve hashear a senha aqui (ex: bcrypt.hash)
            state, 
            phone, 
            institution
        });

        console.log("Novo usuário registrado no DB:", newUser.id);

        // 4. Resposta
        res.status(201).json({
            message: "Usuário cadastrado com sucesso!",
            user: newUser.toJSON() // Remove a senha do retorno
        });

    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validação
        if (!email || !password) {
            return res.status(400).json({ error: "Email e senha são obrigatórios." });
        }

        // 2. Busca o usuário no Banco de Dados
        const user = await User.findByEmail(email);

        // 3. Verificação de Credenciais
        if (!user) {
            return res.status(401).json({ error: "Usuário não encontrado." });
        }

        // Comparação de senha (Texto puro para protótipo, use bcrypt.compare em produção)
        if (user.password !== password) {
            return res.status(401).json({ error: "Senha incorreta." });
        }
        
        console.log(`Login realizado com sucesso: ${email}`);

        // 4. Resposta com Token simulado
        res.status(200).json({
            message: "Login realizado com sucesso!",
            user: user.toJSON(),
            // Em produção, aqui geramos um token real (ex: jwt.sign)
            token: `simulated-jwt-token-${user.id}-${Date.now()}` 
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
};