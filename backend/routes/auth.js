// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Conexión a la base de datos
const { registrarHistorial } = require('../utils/historial');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || "clave_secreta"; // Cambiar en producción

// Middleware para verificar el token
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

// Middleware para verificar que el usuario es administrador
const verificarAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Acceso denegado: Solo administradores pueden realizar esta acción.' });
  }
};

// 🚀 Registro de Usuarios
router.post('/register', async (req, res) => {
  const { nombre, username, password, rol } = req.body;
  try {
    // Verificar que el usuario no exista
    const existingUser = await db.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO usuarios (nombre, username, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, username, rol',
      [nombre, username, hashedPassword, rol || 'usuario']
    );
    // Como en el registro no hay usuario autenticado, registramos el evento sin usuario (o se puede asignar un valor predeterminado)
    await registrarHistorial(req, `Se registró el usuario "${username}" con rol ${rol || 'usuario'}`);
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar usuario' });
  }
});

// 🚀 Inicio de Sesión
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ success: true, token, userId: user.id, username: user.username, rol: user.rol });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el inicio de sesión' });
  }
});

// 🚀 Obtener el historial de cambios totales del sistema (solo admin)
router.get('/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT h.*, u.username FROM historial_cambios h JOIN usuarios u ON h.usuario_id = u.id ORDER BY h.fecha DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener el historial de cambios' });
  }
});

// 🚀 Eliminar un registro del historial (solo admin)
router.delete('/historial/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM historial_cambios WHERE id = $1', [id]);
    res.json({ success: true, message: 'Registro del historial eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el registro del historial' });
  }
});

// 🚀 Eliminar todo el historial (solo admin)
router.delete('/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM historial_cambios');
    res.json({ success: true, message: 'Historial eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el historial' });
  }
});

// 🚀 Obtener la lista de usuarios (solo admin)
router.get('/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre, username, rol, created_at FROM usuarios ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener los usuarios' });
  }
});

// 🚀 Actualizar el rol de un usuario (solo admin)
router.put('/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;
  try {
    const result = await db.query(
      'UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING id, nombre, username, rol',
      [rol, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    await registrarHistorial(req, `Se actualizó el rol del usuario con id ${id} a ${rol}`);
    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al actualizar el rol del usuario' });
  }
});

// 🚀 Eliminar un usuario (solo admin)
router.delete('/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó el usuario con id ${id}`);
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el usuario' });
  }
});

module.exports = router;
module.exports.verificarToken = verificarToken;