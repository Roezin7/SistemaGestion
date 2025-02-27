// backend/middleware.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || "clave_secreta";

const verificarToken = (req, res, next) => {
  let token = req.header('Authorization');
  if (!token) return res.status(401).json({ success: false, message: 'Acceso denegado' });
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Solo administradores pueden realizar esta acción.' });
  }
};

module.exports = { verificarToken, verificarAdmin };
