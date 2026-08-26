import jwt from 'jsonwebtoken'; 

export default function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado! Token não fornecido.' });
    }

    try {
        const secret = process.env.JWT_SECRET;        
        const decoded = jwt.verify(token, secret);
        req.usuarioId = decoded.id; 

        next(); 

    } catch (error) {
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
}