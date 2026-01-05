const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route POST /api/auth/register
 * @desc Registar um novo utilizador
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @desc Autenticar utilizador e gerar token (simulado)
 * @access Public
 */
router.post('/login', authController.login);

module.exports = router;