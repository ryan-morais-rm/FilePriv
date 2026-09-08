import express from 'express';
import adminController from '../controllers/adminController.js';
import verificarAdmin from '../middlewares/adminMiddleware.js';

const adminRouter = express.Router();

adminRouter.post('/login', adminController.login);
adminRouter.post('/servidores/popular-subnet', verificarAdmin, adminController.popularSubnet);
adminRouter.get('/servidores', verificarAdmin, adminController.listarServidores);

export default adminRouter;