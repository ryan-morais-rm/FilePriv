const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Middleware de upload (Ex: Multer) seria injetado aqui
// const upload = require('../middleware/upload');

/**
 * @route POST /api/files/upload
 * @desc Enviar um novo arquivo para ser criptografado e distribuído
 * @access Private (Requereria middleware de auth)
 */
router.post('/upload', fileController.uploadFile);

/**
 * @route GET /api/files/list/:userId
 * @desc Listar todos os arquivos de um utilizador específico
 * @access Private
 */
router.get('/list/:userId', fileController.listFiles);

/**
 * @route GET /api/files/download/:fileId
 * @desc Recuperar, descriptografar e baixar um arquivo
 * @access Private
 */
router.get('/download/:fileId', fileController.downloadFile);

module.exports = router;