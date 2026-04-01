// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const {
  NOMBRE_OFICINA_POR_DEFECTO,
  resolverOficinaObjetivo,
} = require('../utils/oficinas');
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

function construirPayloadToken(user) {
  return {
    id: user.id,
    username: user.username,
    rol: user.rol,
    oficina_id: user.oficina_id,
    oficina_nombre: user.oficina_nombre,
  };
}

async function obtenerUsuarioDesdeToken(req) {
  const token = extraerToken(req);
  if (!token) {
    return null;
  }

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

    return result.rows[0] || null;
  } catch {
    return null;
  }
}

async function contarAdmins(oficinaId) {
  const result = await db.query(
    "SELECT COUNT(*)::int AS total FROM usuarios WHERE rol = 'admin' AND oficina_id = $1",
    [oficinaId]
  );
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

router.get('/oficinas', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, created_at FROM oficinas ORDER BY nombre ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener oficinas' });
  }
});

router.post('/register', async (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  const username = normalizarTexto(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const rolSolicitado = normalizarTexto(req.body.rol);
  const oficinaId = req.body.oficinaId ? Number.parseInt(req.body.oficinaId, 10) : null;
  const oficinaNombre = normalizarTexto(req.body.oficinaNombre);

  if (!nombre || !username || !password) {
    return res.status(400).json({ success: false, message: 'Nombre, usuario y contraseña son obligatorios' });
  }

  if (rolSolicitado && !esRolValido(rolSolicitado)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  if (req.body.oficinaId && !oficinaId) {
    return res.status(400).json({ success: false, message: 'La oficina seleccionada no es válida' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const totalUsuariosResult = await client.query('SELECT COUNT(*)::int AS total FROM usuarios');
    const totalUsuarios = totalUsuariosResult.rows[0]?.total || 0;
    const usuarioSolicitante = await obtenerUsuarioDesdeToken(req);
    const rolFinal = resolverRolRegistro({ totalUsuarios, rolSolicitado, usuarioSolicitante });

    if (!rolFinal) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Solo un administrador puede registrar nuevos usuarios',
      });
    }

    const existingUser = await client.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    const oficina = await resolverOficinaObjetivo(
      {
        oficinaId,
        oficinaNombre: totalUsuarios === 0 ? (oficinaNombre || NOMBRE_OFICINA_POR_DEFECTO) : oficinaNombre,
        oficinaFallbackId: usuarioSolicitante?.oficina_id || null,
      },
      client
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO usuarios (nombre, username, password, rol, oficina_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, username, rol, oficina_id`,
      [nombre, username, hashedPassword, rolFinal, oficina.id]
    );

    const usuarioCreado = {
      ...result.rows[0],
      oficina_nombre: oficina.nombre,
    };

    await registrarHistorial(
      { user: usuarioSolicitante || null },
      `Se registró el usuario "${username}" con rol ${rolFinal} en ${oficina.nombre}`,
      {
        oficinaId: oficina.id,
        usuarioId: usuarioSolicitante?.id || usuarioCreado.id,
        client,
      }
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, user: usuarioCreado });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Error al registrar usuario' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const username = normalizarTexto(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  try {
    const result = await db.query(
      `SELECT
         u.*,
         o.nombre AS oficina_nombre
       FROM usuarios u
       LEFT JOIN oficinas o ON o.id = u.oficina_id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(construirPayloadToken(user), SECRET_KEY, { expiresIn: '8h' });

    res.json({
      success: true,
      token,
      userId: user.id,
      username: user.username,
      rol: user.rol,
      oficinaId: user.oficina_id,
      oficina: user.oficina_nombre,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error en el inicio de sesión' });
  }
});

router.get('/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         h.*,
         COALESCE(u.username, 'Sistema') AS username,
         o.nombre AS oficina_nombre
       FROM historial_cambios h
       LEFT JOIN usuarios u ON h.usuario_id = u.id
       LEFT JOIN oficinas o ON h.oficina_id = o.id
       WHERE h.oficina_id = $1
       ORDER BY h.fecha DESC`,
      [req.user.oficina_id]
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
    const result = await db.query(
      'DELETE FROM historial_cambios WHERE id = $1 AND oficina_id = $2 RETURNING id',
      [id, req.user.oficina_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    res.json({ success: true, message: 'Registro del historial eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el registro del historial' });
  }
});

router.delete('/historial', verificarToken, verificarAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM historial_cambios WHERE oficina_id = $1', [req.user.oficina_id]);
    res.json({ success: true, message: 'Historial eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el historial' });
  }
});

router.get('/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         u.id,
         u.nombre,
         u.username,
         u.rol,
         u.created_at,
         u.oficina_id,
         o.nombre AS oficina_nombre
       FROM usuarios u
       LEFT JOIN oficinas o ON o.id = u.oficina_id
       WHERE u.oficina_id = $1
       ORDER BY u.id`,
      [req.user.oficina_id]
    );
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
    const usuarioActual = await db.query(
      'SELECT id, rol, oficina_id FROM usuarios WHERE id = $1 AND oficina_id = $2',
      [id, req.user.oficina_id]
    );

    if (usuarioActual.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (Number(id) === req.user.id && usuarioActual.rows[0].rol === 'admin' && rol !== 'admin') {
      const totalAdmins = await contarAdmins(req.user.oficina_id);
      if (totalAdmins <= 1) {
        return res.status(400).json({ success: false, message: 'No puedes quitar el último administrador de la oficina' });
      }
    }

    const result = await db.query(
      `UPDATE usuarios
       SET rol = $1
       WHERE id = $2 AND oficina_id = $3
       RETURNING id, nombre, username, rol, oficina_id`,
      [rol, id, req.user.oficina_id]
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
    const usuarioActual = await db.query(
      'SELECT id, rol, oficina_id FROM usuarios WHERE id = $1 AND oficina_id = $2',
      [id, req.user.oficina_id]
    );

    if (usuarioActual.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (usuarioActual.rows[0].rol === 'admin') {
      const totalAdmins = await contarAdmins(req.user.oficina_id);
      if (totalAdmins <= 1) {
        return res.status(400).json({ success: false, message: 'No puedes eliminar el último administrador de la oficina' });
      }
    }

    await db.query('DELETE FROM usuarios WHERE id = $1 AND oficina_id = $2', [id, req.user.oficina_id]);
    await registrarHistorial(req, `Se eliminó el usuario con id ${id}`);
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al eliminar el usuario' });
  }
});

module.exports = router;
