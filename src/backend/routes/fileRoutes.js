// Preciso de rotas GET que forneçam quantidade de arquivos armazenados
// Preciso de rotas GET que forneçam nome do arquivo, data de upload e descrição do arquivo 

const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fileController = require('../controllers/fileController');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('arquivo'), fileController.uploadFile);
router.get('/armazenados/:usuario_id', fileController.filesStored); 

module.exports = router;