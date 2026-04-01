const db = require('../db');

const NOMBRE_OFICINA_POR_DEFECTO = 'Oficina principal';

function normalizarNombreOficina(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
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

module.exports = {
  NOMBRE_OFICINA_POR_DEFECTO,
  normalizarNombreOficina,
  obtenerOficinaPorId,
  obtenerOficinaPorNombre,
  crearOficina,
  obtenerOficinaPredeterminada,
  resolverOficinaObjetivo,
};
