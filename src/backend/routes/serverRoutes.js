const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');

/**
 * @route GET /api/servers
 * @desc Obter o status e especificações de todos os nós de armazenamento
 * @access Private/Admin
 */
router.get('/', serverController.getAllNodes);

/**
 * @route PUT /api/servers/:nodeId/specs
 * @desc Atualizar especificações de hardware (CPU, RAM, Disco) de um nó
 * @access Private/Admin
 */
router.put('/:nodeId/specs', serverController.updateNodeSpecs);

module.exports = router;