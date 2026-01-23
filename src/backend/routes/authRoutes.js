import express from 'express'; 
import userController from '../controllers/authController.js';

const authRouter = express.Router();

authRouter.post('/cadastro', userController.createUser);
authRouter.post('/login', userController.loginUser);
authRouter.get('/perfil/:id', userController.consultUser);


export default authRouter;