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

// Provedores externos
authRouter.post('/provedores/s3', verificarToken, provedorController.conectarS3);
authRouter.delete('/provedores/s3', verificarToken, provedorController.desconectarS3);
authRouter.get('/provedores', verificarToken, provedorController.listarProvedores);

export default authRouter;