import express from 'express'; 
import multer from 'multer';
import fileController from '../controllers/fileController.js';
import verificarToken from '../middlewares/authMiddleware.js';

const fileRouter = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

fileRouter.post('/upload', verificarToken, upload.single('arquivo'), fileController.uploadFile);
fileRouter.get('/download/:id', verificarToken, fileController.downloadFile);
fileRouter.delete('/:id', verificarToken, fileController.deleteFile);
fileRouter.get('/armazenados/quantidade', verificarToken, fileController.filesStored); 
fileRouter.get('/armazenados/lista', verificarToken, fileController.listUserFiles);
fileRouter.get('/metricas', verificarToken, fileController.metricas);
fileRouter.get('/regras', fileController.verifiyFile);
fileRouter.get('/categorias', verificarToken, fileController.listarCategoriasArquivo);

export default fileRouter;