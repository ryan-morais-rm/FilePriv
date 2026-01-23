import express from 'express'; 
import multer from 'multer';
import path from 'path';
import fileController from '../controllers/fileController.js';
import verificarToken from '../middlewares/authMiddleware.js';

const fileRouter = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

fileRouter.post('/upload', verificarToken, upload.single('arquivo'), fileController.uploadFile);
fileRouter.get('/download/:id', verificarToken, fileController.downloadFile);
fileRouter.get('/armazenados/quantidade/', verificarToken, fileController.filesStored); 
fileRouter.get('/armazenados/lista/', verificarToken, fileController.listUserFiles);

export default fileRouter;