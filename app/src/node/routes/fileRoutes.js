import express from 'express'; 
import multer from 'multer';
import fileController from '../controllers/fileController.js';
import verificarToken from '../middlewares/authMiddleware.js';

const fileRouter = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

fileRouter.post('/upload', verificarToken, upload.single('arquivo'), fileController.uploadFile);
fileRouter.get('/download/:id', verificarToken, fileController.downloadFile);
fileRouter.get('/armazenados/quantidade', verificarToken, fileController.filesStored); 
fileRouter.get('/armazenados/lista', verificarToken, fileController.listUserFiles);
fileRouter.get('/regras', fileController.verifiyFile);
fileRouter.delete('/:id', verificarToken, fileController.deleteFile);

export default fileRouter;