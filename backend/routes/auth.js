// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const {
  NOMBRE_OFICINA_POR_DEFECTO,
  normalizarListaOficinaIds,
  resolverOficinaObjetivo,
  listarOficinas,
  crearOficina,
  renombrarOficina,
  obtenerPerfilUsuario,
  obtenerOficinasUsuario,
  asegurarAccesoUsuarioAOficina,
  reemplazarAccesosUsuario,
  usuarioTieneAccesoAOficina,
} = require('../utils/oficinas');
const { verificarToken, verificarAdmin, extraerToken, esRolValido } = require('../middleware');
const {
  signAuthToken,
  verifyAuthToken,
  createRateLimiter,
  validarPasswordSegura,
} = require('../utils/security');

const router = express.Router();
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: 'login',
  message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.',
});
const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  keyPrefix: 'register',
  message: 'Demasiados intentos de registro. Intenta de nuevo más tarde.',
});
const BCRYPT_SALT_ROUNDS = 12;

function validarUsername(username) {
  if (username.length < 4 || username.length > 50) {
    return 'El usuario debe tener entre 4 y 50 caracteres';
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return 'El usuario solo puede contener letras, números, punto, guion y guion bajo';
  }

  return null;
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
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

function construirRespuestaSesion(user, token) {
  return {
    success: true,
    token,
    userId: user.id,
    username: user.username,
    rol: user.rol,
    oficinaId: user.oficina_id,
    oficina: user.oficina_nombre,
    oficinas: user.oficinas || [],
  };
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
    const decoded = verifyAuthToken(token);
    return obtenerPerfilUsuario(decoded.id, decoded.oficina_id);
  } catch {
    return null;
  }
}

async function contarAdmins(oficinaId, client = db) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT u.id)::int AS total
     FROM usuarios u
     INNER JOIN usuario_oficinas uo ON uo.usuario_id = u.id
     WHERE u.rol = 'admin' AND uo.oficina_id = $1`,
    [oficinaId]
  );
  return result.rows[0]?.total || 0;
}

async function obtenerIdsOficinasValidos(oficinaIds, client = db) {
  const ids = normalizarListaOficinaIds(oficinaIds);
  if (!ids.length) {
    return [];
  }

  const result = await client.query(
    'SELECT id FROM oficinas WHERE id = ANY($1::int[]) ORDER BY id',
    [ids]
  );

  return result.rows.map((row) => row.id);
}

async function actualizarOficinaActivaUsuario(usuarioId, oficinaId, client = db) {
  await client.query(
    'UPDATE usuarios SET oficina_id = $1 WHERE id = $2',
    [oficinaId, usuarioId]
  );
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
    const oficinas = await listarOficinas();
    const usuario = await obtenerUsuarioDesdeToken(req);

    if (!usuario) {
      const setupStatus = await db.query('SELECT COUNT(*)::int AS total FROM usuarios');
      if ((setupStatus.rows[0]?.total || 0) > 0) {
        return res.status(401).json({ success: false, message: 'Acceso denegado' });
      }
      return res.json(oficinas);
    }

    const accesos = new Set((usuario.oficinas || []).map((oficina) => oficina.id));
    return res.json(
      oficinas.map((oficina) => ({
        ...oficina,
        tiene_acceso: accesos.has(oficina.id),
        es_actual: usuario.oficina_id === oficina.id,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al obtener oficinas' });
  }
});

router.get('/me', verificarToken, async (req, res) => {
  const token = extraerToken(req);
  res.json(construirRespuestaSesion(req.user, token));
});

router.post('/switch-office', verificarToken, async (req, res) => {
  const oficinaId = Number.parseInt(req.body.oficinaId, 10);
  if (!Number.isInteger(oficinaId) || oficinaId <= 0) {
    return res.status(400).json({ success: false, message: 'La oficina seleccionada no es válida' });
  }

  try {
    const tieneAcceso = (req.user.oficinas || []).some((oficina) => oficina.id === oficinaId);
    if (!tieneAcceso) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a esa oficina' });
    }

    await actualizarOficinaActivaUsuario(req.user.id, oficinaId);
    const perfilActualizado = await obtenerPerfilUsuario(req.user.id, oficinaId);
    const token = signAuthToken(construirPayloadToken(perfilActualizado));

    res.json(construirRespuestaSesion(perfilActualizado, token));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'No se pudo cambiar de oficina' });
  }
});

router.post('/oficinas', verificarToken, verificarAdmin, async (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  if (!nombre) {
    return res.status(400).json({ success: false, message: 'El nombre de la oficina es obligatorio' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const oficina = await crearOficina(nombre, client);
    await asegurarAccesoUsuarioAOficina(req.user.id, oficina.id, client);
    await registrarHistorial(req, `Se creó la oficina "${oficina.nombre}"`, {
      oficinaId: req.user.oficina_id,
      client,
    });
    await client.query('COMMIT');

    res.status(201).json({ success: true, oficina });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'No se pudo crear la oficina' });
  } finally {
    client.release();
  }
});

router.put('/oficinas/:id', verificarToken, verificarAdmin, async (req, res) => {
  const oficinaId = Number.parseInt(req.params.id, 10);
  const nombre = normalizarTexto(req.body.nombre);

  if (!Number.isInteger(oficinaId) || oficinaId <= 0) {
    return res.status(400).json({ success: false, message: 'La oficina seleccionada no es válida' });
  }

  if (!nombre) {
    return res.status(400).json({ success: false, message: 'El nombre de la oficina es obligatorio' });
  }

  try {
    const tieneAcceso = await usuarioTieneAccesoAOficina(req.user.id, oficinaId);
    if (!tieneAcceso) {
      return res.status(403).json({ success: false, message: 'No tienes acceso para renombrar esta oficina' });
    }

    const oficina = await renombrarOficina(oficinaId, nombre);
    if (!oficina) {
      return res.status(404).json({ success: false, message: 'Oficina no encontrada' });
    }

    await registrarHistorial(req, `Se renombró la oficina a "${oficina.nombre}"`, {
      oficinaId,
    });
    res.json({ success: true, oficina });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'No se pudo renombrar la oficina' });
  }
});

router.post('/register', registerRateLimiter, async (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  const username = normalizarTexto(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const rolSolicitado = normalizarTexto(req.body.rol);
  const oficinaId = req.body.oficinaId ? Number.parseInt(req.body.oficinaId, 10) : null;
  const oficinaNombre = normalizarTexto(req.body.oficinaNombre);

  if (!nombre || !username || !password) {
    return res.status(400).json({ success: false, message: 'Nombre, usuario y contraseña son obligatorios' });
  }

  const usernameError = validarUsername(username);
  if (usernameError) {
    return res.status(400).json({ success: false, message: usernameError });
  }

  const passwordError = validarPasswordSegura(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const result = await client.query(
      `INSERT INTO usuarios (nombre, username, password, rol, oficina_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, username, rol, oficina_id`,
      [nombre, username, hashedPassword, rolFinal, oficina.id]
    );

    await asegurarAccesoUsuarioAOficina(result.rows[0].id, oficina.id, client);

    const usuarioCreado = await obtenerPerfilUsuario(result.rows[0].id, oficina.id, client);

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

router.post('/login', loginRateLimiter, async (req, res) => {
  const username = normalizarTexto(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const oficinaId = req.body.oficinaId ? Number.parseInt(req.body.oficinaId, 10) : null;

  try {
    const result = await db.query(
      'SELECT * FROM usuarios WHERE username = $1',
      [username]
    );

    const invalidCredentialsResponse = { success: false, message: 'Usuario o contraseña incorrectos' };
    if (result.rows.length === 0) {
      return res.status(401).json(invalidCredentialsResponse);
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json(invalidCredentialsResponse);
    }

    const perfil = await obtenerPerfilUsuario(user.id, oficinaId || user.oficina_id);
    if (!perfil) {
      return res.status(403).json({ success: false, message: 'El usuario no tiene oficinas asignadas' });
    }

    if (perfil.oficina_id !== user.oficina_id) {
      await actualizarOficinaActivaUsuario(user.id, perfil.oficina_id);
    }

    const token = signAuthToken(construirPayloadToken(perfil));
    res.json(construirRespuestaSesion(perfil, token));
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
         u.oficina_id AS oficina_actual_id,
         o_actual.nombre AS oficina_actual_nombre,
         COALESCE((
           SELECT json_agg(json_build_object('id', o.id, 'nombre', o.nombre) ORDER BY o.nombre)
           FROM usuario_oficinas uo2
           INNER JOIN oficinas o ON o.id = uo2.oficina_id
           WHERE uo2.usuario_id = u.id
         ), '[]'::json) AS oficinas
       FROM usuarios u
       INNER JOIN usuario_oficinas scope ON scope.usuario_id = u.id AND scope.oficina_id = $1
       LEFT JOIN oficinas o_actual ON o_actual.id = u.oficina_id
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
  const userId = Number.parseInt(req.params.id, 10);
  const rol = normalizarTexto(req.body.rol);
  const oficinaIdsSolicitados = Array.isArray(req.body.oficinaIds)
    ? normalizarListaOficinaIds(req.body.oficinaIds)
    : null;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Usuario inválido' });
  }

  if (rol && !esRolValido(rol)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const usuarioActual = await obtenerPerfilUsuario(userId, null, client);
    if (!usuarioActual || !usuarioActual.oficinas.some((oficina) => oficina.id === req.user.oficina_id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const oficinasActuales = usuarioActual.oficinas.map((oficina) => oficina.id);
    const oficinasFinales = oficinaIdsSolicitados?.length ? oficinaIdsSolicitados : oficinasActuales;

    const oficinasValidas = await obtenerIdsOficinasValidos(oficinasFinales, client);
    if (oficinasValidas.length !== oficinasFinales.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Una o más oficinas seleccionadas no existen' });
    }

    if (req.user.id === userId && !oficinasFinales.includes(req.user.oficina_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cambia primero a otra oficina antes de quitarte acceso a la actual' });
    }

    const conservaAccesoActual = oficinasFinales.includes(req.user.oficina_id);
    const rolFinal = rol || usuarioActual.rol;
    if (usuarioActual.rol === 'admin' && (!conservaAccesoActual || rolFinal !== 'admin')) {
      const totalAdmins = await contarAdmins(req.user.oficina_id, client);
      if (totalAdmins <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No puedes quitar al último administrador de esta oficina' });
      }
    }

    const oficinaActivaFinal = oficinasFinales.includes(usuarioActual.oficina_id)
      ? usuarioActual.oficina_id
      : oficinasFinales[0];

    await client.query(
      'UPDATE usuarios SET rol = $1, oficina_id = $2 WHERE id = $3',
      [rolFinal, oficinaActivaFinal, userId]
    );
    await reemplazarAccesosUsuario(userId, oficinasFinales, client);

    const usuarioActualizado = await obtenerPerfilUsuario(userId, oficinaActivaFinal, client);
    await registrarHistorial(
      req,
      `Se actualizó el usuario "${usuarioActualizado.username}"`,
      { oficinaId: req.user.oficina_id, client }
    );

    await client.query('COMMIT');
    res.json({ success: true, usuario: usuarioActualizado });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Error al actualizar el usuario' });
  } finally {
    client.release();
  }
});

router.delete('/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Usuario inválido' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ success: false, message: 'No puedes eliminar tu propio acceso desde la oficina actual' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const usuarioActual = await obtenerPerfilUsuario(userId, null, client);
    if (!usuarioActual || !usuarioActual.oficinas.some((oficina) => oficina.id === req.user.oficina_id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (usuarioActual.rol === 'admin') {
      const totalAdmins = await contarAdmins(req.user.oficina_id, client);
      if (totalAdmins <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No puedes quitar al último administrador de esta oficina' });
      }
    }

    await client.query(
      'DELETE FROM usuario_oficinas WHERE usuario_id = $1 AND oficina_id = $2',
      [userId, req.user.oficina_id]
    );

    const oficinasRestantes = await obtenerOficinasUsuario(userId, client);
    let message = 'Acceso eliminado de la oficina actual';

    if (!oficinasRestantes.length) {
      await client.query('DELETE FROM usuarios WHERE id = $1', [userId]);
      message = 'Usuario eliminado';
    } else if (usuarioActual.oficina_id === req.user.oficina_id) {
      await actualizarOficinaActivaUsuario(userId, oficinasRestantes[0].id, client);
    }

    await registrarHistorial(req, `Se eliminó acceso del usuario con id ${userId} en la oficina actual`, {
      oficinaId: req.user.oficina_id,
      client,
    });

    await client.query('COMMIT');
    res.json({ success: true, message });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Error al eliminar el usuario' });
  } finally {
    client.release();
  }
});

module.exports = router;
