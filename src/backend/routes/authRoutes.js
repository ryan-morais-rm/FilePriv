// homepage.html 
// preciso de rotas GET entreguem nome, email

const express = require('express');
const router = express.Router();
const userController = require('../controllers/authController');

router.post('/cadastro', userController.createUser);
router.post('/login', userController.loginUser);
router.get('/perfil/:id', userController.consultUser);


module.exports = router;