import express from 'express'; 
import userController from '../controllers/authController.js';
import verificarToken from '../middlewares/authMiddleware.js';

const authRouter = express.Router();

// Rotas públicas
authRouter.post('/cadastro', userController.createUser);
authRouter.post('/login', userController.loginUser);

// Rota privada
authRouter.get('/perfil/:id', verificarToken, userController.consultUser);
authRouter.put('/perfil', verificarToken, userController.updateProfile);
authRouter.get('/categorias-perfil', userController.listarCategoriasPerfil);

export default authRouter;