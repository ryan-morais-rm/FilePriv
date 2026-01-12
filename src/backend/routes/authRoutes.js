// homepage.html 
// preciso de rotas GET entreguem nome, email
// preciso de rotas POST entreguem nome, email, senha 

// login.html
// preciso de rotas POST para email e senha


const express = require('express');
const router = express.Router();
const userController = require('../controllers/authController');

router.get('/consultar', userController.consultUser);

router.post('/cadastro', userController.createUser);
router.post('/login', userController.loginUser);

module.exports = router;
