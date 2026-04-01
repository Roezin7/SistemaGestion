// backend/middleware.js
const { obtenerPerfilUsuario } = require('./utils/oficinas');
const { verifyAuthToken } = require('./utils/security');
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
  if (!token) {
    return res.status(401).json({ success: false, message: 'Acceso denegado' });
  }

  try {
    const decoded = verifyAuthToken(token);
    const user = await obtenerPerfilUsuario(decoded.id, decoded.oficina_id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado o sin acceso a oficinas' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Error validando token:', error.message);
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const verificarRol = (...rolesPermitidos) => (req, res, next) => {
  const rol = req.user?.rol;
  if (rol && rolesPermitidos.includes(rol)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Acceso denegado: rol insuficiente.' });
};

const verificarAdmin = verificarRol('admin');

function allowRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (rol && rolesPermitidos.includes(rol)) {
      return next();
    }
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
