const User = require('../models/User');
// const authService = require('../services/authService'); // Futuro serviço de hash/token

/**
 * Controller responsável pela autenticação e gestão de usuários.
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, state, phone, institution } = req.body;

        // 1. Validação básica (O Garçom verifica se o pedido está completo)
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: "Campos obrigatórios (nome, email, senha) estão faltando." 
            });
        }

        // 2. Criação do Modelo
        // Aqui geraríamos um ID único real, por enquanto usamos Date.now()
        const newUser = new User(Date.now().toString(), name, email, password, state, phone, institution);

        // 3. Lógica de Persistência (Chamaria um Service/Model para salvar no db.json)
        // await authService.saveUser(newUser); 
        console.log("Novo usuário registrado:", newUser.toJSON());

        // 4. Resposta
        res.status(201).json({
            message: "Usuário cadastrado com sucesso!",
            user: newUser.toJSON()
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

        // 2. Verificação (Simulada - Aqui o Service buscaria no DB)
        // const user = await authService.findUserByEmail(email);
        // if (!user || user.password !== password) ...
        
        console.log(`Tentativa de login para: ${email}`);

        // Simulação de Sucesso
        res.status(200).json({
            message: "Login realizado com sucesso!",
            token: "simulated-jwt-token-xyz-123" // Em produção, usaríamos JWT real
        });

    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
};