const authModel = require('../models/authModel')

const userController = {
    async loginUser(req, res) {
        try { 
            authModel.validarAcesso(req, res);

        } catch (error) {
            console.log("7. ERRO ACONTECEU:", error);
            return res.status(500).json({ error: 'Erro ao logar usuário'} ); 
        }
    },
    
    async createUser(req, res) {
        try {
            authModel.criarUsuario(req, res); 

        } catch (error) {
            console.log("Não foi possível criar o usuário: ", error); 
            return res.status(500).json( {error: 'Erro ao criar usuário'} ); 
        }
    },

    async consultUser(req, res) {
        try {
            authModel.consultarUsuario(req, res); 
            
        } catch (error) {
            console.log("Não foi possível consultar o usuaŕio: ", error); 
            return res.status(500).json( {error: 'Erro ao consultar usuário'} ); 
        }
    }
};

module.exports = userController;