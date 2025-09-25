// backend/middleware.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || "clave_secreta";

const verificarToken = (req, res, next) => {
  let token = req.header('Authorization');
  if (!token) return res.status(401).json({ success: false, message: 'Acceso denegado' });
  if (token.startsWith('Bearer ')) token = token.slice(7).trim();
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // { id, username, nombre, rol }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const verificarRol = (...rolesPermitidos) => (req, res, next) => {
  const rol = req.user?.rol;
  if (rol && rolesPermitidos.includes(rol)) return next();
  return res.status(403).json({ success: false, message: 'Acceso denegado: rol insuficiente.' });
};

const verificarAdmin = verificarRol('admin');

module.exports = { verificarToken, verificarRol, verificarAdmin };
