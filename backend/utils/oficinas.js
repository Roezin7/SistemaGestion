const db = require('../db');

const NOMBRE_OFICINA_POR_DEFECTO = 'Oficina principal';

function normalizarNombreOficina(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarListaOficinaIds(oficinaIds) {
  if (!Array.isArray(oficinaIds)) {
    return [];
  }

  return Array.from(
    new Set(
      oficinaIds
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

async function obtenerOficinaPorId(oficinaId, client = db) {
  if (!oficinaId) {
    return null;
  }

  const result = await client.query(
    'SELECT id, nombre, created_at FROM oficinas WHERE id = $1',
    [oficinaId]
  );

  return result.rows[0] || null;
}

async function obtenerOficinaPorNombre(nombre, client = db) {
  const nombreNormalizado = normalizarNombreOficina(nombre);
  if (!nombreNormalizado) {
    return null;
  }

  const result = await client.query(
    'SELECT id, nombre, created_at FROM oficinas WHERE lower(nombre) = lower($1) ORDER BY id LIMIT 1',
    [nombreNormalizado]
  );

  return result.rows[0] || null;
}

async function crearOficina(nombre, client = db) {
  const nombreNormalizado = normalizarNombreOficina(nombre) || NOMBRE_OFICINA_POR_DEFECTO;
  const existente = await obtenerOficinaPorNombre(nombreNormalizado, client);
  if (existente) {
    return existente;
  }

  const result = await client.query(
    'INSERT INTO oficinas (nombre) VALUES ($1) RETURNING id, nombre, created_at',
    [nombreNormalizado]
  );

  return result.rows[0];
}

async function renombrarOficina(oficinaId, nombre, client = db) {
  const nombreNormalizado = normalizarNombreOficina(nombre);
  if (!nombreNormalizado) {
    throw new Error('El nombre de la oficina es obligatorio');
  }

  const existente = await obtenerOficinaPorNombre(nombreNormalizado, client);
  if (existente && existente.id !== Number(oficinaId)) {
    throw new Error('Ya existe una oficina con ese nombre');
  }

  const result = await client.query(
    `UPDATE oficinas
     SET nombre = $1
     WHERE id = $2
     RETURNING id, nombre, created_at`,
    [nombreNormalizado, oficinaId]
  );

  return result.rows[0] || null;
}

async function obtenerOficinaPredeterminada(client = db) {
  const existente = await obtenerOficinaPorNombre(NOMBRE_OFICINA_POR_DEFECTO, client);
  if (existente) {
    return existente;
  }

  const primeraOficina = await client.query(
    'SELECT id, nombre, created_at FROM oficinas ORDER BY id LIMIT 1'
  );

  if (primeraOficina.rows[0]) {
    return primeraOficina.rows[0];
  }

  return crearOficina(NOMBRE_OFICINA_POR_DEFECTO, client);
}

async function resolverOficinaObjetivo({ oficinaId, oficinaNombre, oficinaFallbackId }, client = db) {
  if (oficinaId) {
    const oficina = await obtenerOficinaPorId(oficinaId, client);
    if (!oficina) {
      throw new Error('La oficina seleccionada no existe');
    }
    return oficina;
  }

  const nombreNormalizado = normalizarNombreOficina(oficinaNombre);
  if (nombreNormalizado) {
    return crearOficina(nombreNormalizado, client);
  }

  if (oficinaFallbackId) {
    const oficina = await obtenerOficinaPorId(oficinaFallbackId, client);
    if (oficina) {
      return oficina;
    }
  }

  return obtenerOficinaPredeterminada(client);
}

async function listarOficinas(client = db) {
  const result = await client.query(
    'SELECT id, nombre, created_at FROM oficinas ORDER BY nombre ASC'
  );
  return result.rows;
}

async function obtenerOficinasUsuario(usuarioId, client = db) {
  const result = await client.query(
    `SELECT o.id, o.nombre, o.created_at
     FROM usuario_oficinas uo
     INNER JOIN oficinas o ON o.id = uo.oficina_id
     WHERE uo.usuario_id = $1
     ORDER BY o.nombre ASC`,
    [usuarioId]
  );

  return result.rows;
}

async function asegurarAccesoUsuarioAOficina(usuarioId, oficinaId, client = db) {
  await client.query(
    `INSERT INTO usuario_oficinas (usuario_id, oficina_id)
     VALUES ($1, $2)
     ON CONFLICT (usuario_id, oficina_id) DO NOTHING`,
    [usuarioId, oficinaId]
  );
}

async function reemplazarAccesosUsuario(usuarioId, oficinaIds, client = db) {
  const idsNormalizados = normalizarListaOficinaIds(oficinaIds);
  if (!idsNormalizados.length) {
    throw new Error('El usuario debe conservar acceso al menos a una oficina');
  }

  await client.query(
    'DELETE FROM usuario_oficinas WHERE usuario_id = $1 AND oficina_id <> ALL($2::int[])',
    [usuarioId, idsNormalizados]
  );

  for (const oficinaId of idsNormalizados) {
    await asegurarAccesoUsuarioAOficina(usuarioId, oficinaId, client);
  }

  return idsNormalizados;
}

async function usuarioTieneAccesoAOficina(usuarioId, oficinaId, client = db) {
  const result = await client.query(
    `SELECT 1
     FROM usuario_oficinas
     WHERE usuario_id = $1 AND oficina_id = $2`,
    [usuarioId, oficinaId]
  );

  return result.rowCount > 0;
}

async function obtenerPerfilUsuario(usuarioId, oficinaActivaSolicitada = null, client = db) {
  const result = await client.query(
    `SELECT
       u.id,
       u.nombre,
       u.username,
       u.rol,
       u.oficina_id AS oficina_actual_id,
       o_actual.nombre AS oficina_actual_nombre,
       COALESCE((
         SELECT json_agg(json_build_object('id', o.id, 'nombre', o.nombre) ORDER BY o.nombre)
         FROM usuario_oficinas uo
         INNER JOIN oficinas o ON o.id = uo.oficina_id
         WHERE uo.usuario_id = u.id
       ), '[]'::json) AS oficinas
     FROM usuarios u
     LEFT JOIN oficinas o_actual ON o_actual.id = u.oficina_id
     WHERE u.id = $1`,
    [usuarioId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const oficinas = Array.isArray(row.oficinas) ? row.oficinas : [];
  if (!oficinas.length && row.oficina_actual_id) {
    oficinas.push({
      id: row.oficina_actual_id,
      nombre: row.oficina_actual_nombre,
    });
  }

  const requestedOfficeId = oficinaActivaSolicitada ? Number.parseInt(oficinaActivaSolicitada, 10) : null;
  const activeOffice =
    oficinas.find((oficina) => oficina.id === requestedOfficeId) ||
    oficinas.find((oficina) => oficina.id === row.oficina_actual_id) ||
    oficinas[0] ||
    null;

  if (!activeOffice) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre,
    username: row.username,
    rol: row.rol,
    oficina_id: activeOffice.id,
    oficina_nombre: activeOffice.nombre,
    oficina_actual_id: row.oficina_actual_id,
    oficina_actual_nombre: row.oficina_actual_nombre,
    oficinas,
  };
}

module.exports = {
  NOMBRE_OFICINA_POR_DEFECTO,
  normalizarNombreOficina,
  normalizarListaOficinaIds,
  obtenerOficinaPorId,
  obtenerOficinaPorNombre,
  crearOficina,
  renombrarOficina,
  obtenerOficinaPredeterminada,
  resolverOficinaObjetivo,
  listarOficinas,
  obtenerOficinasUsuario,
  asegurarAccesoUsuarioAOficina,
  reemplazarAccesosUsuario,
  usuarioTieneAccesoAOficina,
  obtenerPerfilUsuario,
};
