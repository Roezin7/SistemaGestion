// backend/middleware.js
const jwt = require('jsonwebtoken');
const db = require('./db');
const SECRET_KEY = process.env.SECRET_KEY || "clave_secreta";
const ROLES_VALIDOS = ['admin', 'gerente', 'empleado'];

function extraerToken(req) {
  let token = req.header('Authorization');
  if (!token) {
    return null;
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  return token;
}

const verificarToken = async (req, res, next) => {
  const token = extraerToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'Acceso denegado' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const result = await db.query(
      `SELECT
         u.id,
         u.nombre,
         u.username,
         u.rol,
         u.oficina_id,
         o.nombre AS oficina_nombre
       FROM usuarios u
       LEFT JOIN oficinas o ON o.id = u.oficina_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    console.error('Error validando token:', error.message);
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const verificarRol = (...rolesPermitidos) => (req, res, next) => {
  const rol = req.user?.rol;
  if (rol && rolesPermitidos.includes(rol)) return next();
  return res.status(403).json({ success: false, message: 'Acceso denegado: rol insuficiente.' });
};

const verificarAdmin = verificarRol('admin');

// ✅ Nuevo: permitir solo roles específicos
function allowRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (rol && rolesPermitidos.includes(rol)) return next();
    return res.status(403).json({ error: 'No autorizado' });
  };
}

function esRolValido(rol) {
  return ROLES_VALIDOS.includes(rol);
}

module.exports = {
  verificarToken,
  verificarRol,
  verificarAdmin,
  allowRoles,
  extraerToken,
  esRolValido,
  ROLES_VALIDOS,
};
