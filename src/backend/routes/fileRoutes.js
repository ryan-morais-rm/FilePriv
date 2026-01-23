import express from 'express'; 
import multer from 'multer';
import path from 'path';
import fileController from '../controllers/fileController.js';

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

fileRouter.post('/upload', upload.single('arquivo'), fileController.uploadFile);
fileRouter.get('/download/:id', fileController.downloadFile);
fileRouter.get('/armazenados/quantidade/:usuario_id', fileController.filesStored); 
fileRouter.get('/armazenados/lista/:usuario_id', fileController.listUserFiles);

export default fileRouter;