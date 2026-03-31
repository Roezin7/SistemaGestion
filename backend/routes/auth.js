// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken, verificarAdmin, extraerToken, esRolValido } = require('../middleware');

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'clave_secreta';

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function resolverRolRegistro({ totalUsuarios, rolSolicitado, usuarioSolicitante }) {
  if (totalUsuarios === 0) {
    return 'admin';
  }

  if (!usuarioSolicitante || usuarioSolicitante.rol !== 'admin') {
    return null;
  }

  return rolSolicitado || 'empleado';
}

async function obtenerUsuarioDesdeToken(req) {
  const token = extraerToken(req);
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}

async function contarAdmins() {
  const result = await db.query("SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'admin'");
  return result.rows[0]?.total || 0;
}

router.get('/setup-status', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS total FROM usuarios');
    res.json({ setupRequired: result.rows[0]?.total === 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al verificar el estado inicial del sistema' });
  }
});

// Registro de usuarios.
// - Primer usuario del sistema: permitido sin autenticación y se crea como admin.
// - Siguientes usuarios: solo un admin autenticado puede crearlos.
router.post('/register', async (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  const username = normalizarTexto(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const rolSolicitado = normalizarTexto(req.body.rol);

  if (!nombre || !username || !password) {
    return res.status(400).json({ success: false, message: 'Nombre, usuario y contraseña son obligatorios' });
  }

  if (rolSolicitado && !esRolValido(rolSolicitado)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  try {
    const totalUsuariosResult = await db.query('SELECT COUNT(*)::int AS total FROM usuarios');
    const totalUsuarios = totalUsuariosResult.rows[0]?.total || 0;
    const usuarioSolicitante = await obtenerUsuarioDesdeToken(req);
    const rolFinal = resolverRolRegistro({ totalUsuarios, rolSolicitado, usuarioSolicitante });

    if (!rolFinal) {
      return res.status(403).json({
        success: false,
        message: 'Solo un administrador puede registrar nuevos usuarios',
      });
    }

    const existingUser = await db.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO usuarios (nombre, username, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, username, rol',
      [nombre, username, hashedPassword, rolFinal]
    );

    if (usuarioSolicitante) {
      req.user = usuarioSolicitante;
    }
    await registrarHistorial(req, `Se registró el usuario "${username}" con rol ${rolFinal}`);

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al registrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  const username = normalizarTexto(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

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

    const token = jwt.sign(
      { id: user.id, username: user.username, rol: user.rol },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token, userId: user.id, username: user.username, rol: user.rol });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el inicio de sesión' });
  }
});

router.get('/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT h.*, COALESCE(u.username, 'Sistema') AS username
       FROM historial_cambios h
       LEFT JOIN usuarios u ON h.usuario_id = u.id
       ORDER BY h.fecha DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener el historial de cambios' });
  }
});

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

router.delete('/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM historial_cambios');
    res.json({ success: true, message: 'Historial eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el historial' });
  }
});

router.get('/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre, username, rol, created_at FROM usuarios ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener los usuarios' });
  }
});

router.put('/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const rol = normalizarTexto(req.body.rol);

  if (!esRolValido(rol)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  try {
    const usuarioActual = await db.query('SELECT id, rol FROM usuarios WHERE id = $1', [id]);
    if (usuarioActual.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (Number(id) === req.user.id && usuarioActual.rows[0].rol === 'admin' && rol !== 'admin') {
      const totalAdmins = await contarAdmins();
      if (totalAdmins <= 1) {
        return res.status(400).json({ success: false, message: 'No puedes quitar el último administrador del sistema' });
      }
    }

    const result = await db.query(
      'UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING id, nombre, username, rol',
      [rol, id]
    );

    await registrarHistorial(req, `Se actualizó el rol del usuario con id ${id} a ${rol}`);
    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al actualizar el rol del usuario' });
  }
});

router.delete('/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'No puedes eliminar tu propio usuario' });
  }

  try {
    const usuarioActual = await db.query('SELECT id, rol FROM usuarios WHERE id = $1', [id]);
    if (usuarioActual.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (usuarioActual.rows[0].rol === 'admin') {
      const totalAdmins = await contarAdmins();
      if (totalAdmins <= 1) {
        return res.status(400).json({ success: false, message: 'No puedes eliminar el último administrador del sistema' });
      }
    }

    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó el usuario con id ${id}`);
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el usuario' });
  }
});

module.exports = router;
