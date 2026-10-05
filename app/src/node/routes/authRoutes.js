import express from 'express'; 
import userController from '../controllers/authController.js';
import provedorController from '../controllers/provedorController.js';
import verificarToken from '../middlewares/authMiddleware.js';

const authRouter = express.Router();

// Rotas públicas
authRouter.post('/cadastro', userController.createUser);
authRouter.post('/login', userController.loginUser);
authRouter.get('/categorias-perfil', userController.listarCategoriasPerfil);

// Rotas privadas
authRouter.get('/perfil/:id', verificarToken, userController.consultUser);
authRouter.put('/perfil', verificarToken, userController.updateProfile);

// Rotas do provedor s3
authRouter.post('/provedores/s3', verificarToken, provedorController.conectarS3);
authRouter.delete('/provedores/s3', verificarToken, provedorController.desconectarS3);
authRouter.get('/provedores', verificarToken, provedorController.listarProvedores);
authRouter.get('/provedores/metricas', verificarToken, provedorController.metricasProvedores);

// Rotas do provedor Drive
authRouter.get('/provedores/drive/conectar', verificarToken, provedorController.iniciarConexaoDrive);
+authRouter.get('/provedores/drive/callback', provedorController.driveCallback);
+authRouter.delete('/provedores/drive', verificarToken, provedorController.desconectarDrive);
export default authRouter;