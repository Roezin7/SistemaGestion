const express = require('express');
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken, allowRoles } = require('../middleware');

const router = express.Router();

const ESTADOS_VALIDOS = new Set([
  'nuevo',
  'contactado',
  'interesado',
  'seguimiento',
  'no_responde',
  'descartado',
  'convertido',
]);

const PRIORIDADES_VALIDAS = new Set(['alta', 'media', 'baja']);

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarFechaOpcional(valor) {
  return valor === '' || valor === null || typeof valor === 'undefined' ? null : valor;
}

function normalizarEstado(valor, fallback = 'nuevo') {
  const estado = normalizarTexto(valor).toLowerCase();
  return ESTADOS_VALIDOS.has(estado) ? estado : fallback;
}

function normalizarPrioridad(valor, fallback = 'media') {
  const prioridad = normalizarTexto(valor).toLowerCase();
  return PRIORIDADES_VALIDAS.has(prioridad) ? prioridad : fallback;
}

async function obtenerProspectoPorId(id, oficinaId) {
  const result = await db.query(
    `SELECT *
     FROM prospectos
     WHERE id = $1 AND oficina_id = $2`,
    [id, oficinaId]
  );

  return result.rows[0] || null;
}

router.use(verificarToken);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM prospectos
       WHERE oficina_id = $1
       ORDER BY
         CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
         COALESCE(fecha_proximo_seguimiento, DATE '2999-12-31') ASC,
         updated_at DESC`,
      [req.user.oficina_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar prospectos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los prospectos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prospecto = await obtenerProspectoPorId(req.params.id, req.user.oficina_id);
    if (!prospecto) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    return res.json(prospecto);
  } catch (error) {
    console.error('Error al obtener prospecto:', error);
    return res.status(500).json({ error: 'No se pudo cargar el prospecto' });
  }
});

router.post('/', async (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  const telefono = normalizarTexto(req.body.telefono);
  const email = normalizarTexto(req.body.email) || null;
  const interes = normalizarTexto(req.body.interes) || null;
  const origen = normalizarTexto(req.body.origen) || null;
  const estado = normalizarEstado(req.body.estado);
  const prioridad = normalizarPrioridad(req.body.prioridad);
  const fechaUltimoContacto = normalizarFechaOpcional(req.body.fecha_ultimo_contacto);
  const fechaProximoSeguimiento = normalizarFechaOpcional(req.body.fecha_proximo_seguimiento);
  const notas = normalizarTexto(req.body.notas) || null;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO prospectos
         (oficina_id, nombre, telefono, email, interes, origen, estado, prioridad,
          fecha_ultimo_contacto, fecha_proximo_seguimiento, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.oficina_id,
        nombre,
        telefono,
        email,
        interes,
        origen,
        estado,
        prioridad,
        fechaUltimoContacto,
        fechaProximoSeguimiento,
        notas,
      ]
    );

    await registrarHistorial(req, `Se agregó prospecto id ${result.rows[0].id}`);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear prospecto:', error);
    return res.status(500).json({ error: 'No se pudo registrar el prospecto' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const actual = await obtenerProspectoPorId(req.params.id, req.user.oficina_id);
    if (!actual) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    const nombre = normalizarTexto(req.body.nombre) || actual.nombre;
    const telefono = normalizarTexto(req.body.telefono) || actual.telefono;
    const email = Object.prototype.hasOwnProperty.call(req.body, 'email')
      ? normalizarTexto(req.body.email) || null
      : actual.email;
    const interes = Object.prototype.hasOwnProperty.call(req.body, 'interes')
      ? normalizarTexto(req.body.interes) || null
      : actual.interes;
    const origen = Object.prototype.hasOwnProperty.call(req.body, 'origen')
      ? normalizarTexto(req.body.origen) || null
      : actual.origen;
    const estado = Object.prototype.hasOwnProperty.call(req.body, 'estado')
      ? normalizarEstado(req.body.estado, actual.estado)
      : actual.estado;
    const prioridad = Object.prototype.hasOwnProperty.call(req.body, 'prioridad')
      ? normalizarPrioridad(req.body.prioridad, actual.prioridad)
      : actual.prioridad;
    const fechaUltimoContacto = Object.prototype.hasOwnProperty.call(req.body, 'fecha_ultimo_contacto')
      ? normalizarFechaOpcional(req.body.fecha_ultimo_contacto)
      : actual.fecha_ultimo_contacto;
    const fechaProximoSeguimiento = Object.prototype.hasOwnProperty.call(req.body, 'fecha_proximo_seguimiento')
      ? normalizarFechaOpcional(req.body.fecha_proximo_seguimiento)
      : actual.fecha_proximo_seguimiento;
    const notas = Object.prototype.hasOwnProperty.call(req.body, 'notas')
      ? normalizarTexto(req.body.notas) || null
      : actual.notas;

    if (!nombre || !telefono) {
      return res.status(400).json({ error: 'Nombre y teléfono son obligatorios.' });
    }

    const result = await db.query(
      `UPDATE prospectos SET
         nombre = $1,
         telefono = $2,
         email = $3,
         interes = $4,
         origen = $5,
         estado = $6,
         prioridad = $7,
         fecha_ultimo_contacto = $8,
         fecha_proximo_seguimiento = $9,
         notas = $10,
         updated_at = NOW()
       WHERE id = $11 AND oficina_id = $12
       RETURNING *`,
      [
        nombre,
        telefono,
        email,
        interes,
        origen,
        estado,
        prioridad,
        fechaUltimoContacto,
        fechaProximoSeguimiento,
        notas,
        req.params.id,
        req.user.oficina_id,
      ]
    );

    await registrarHistorial(req, `Se actualizó prospecto id ${req.params.id}`);
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar prospecto:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el prospecto' });
  }
});

router.delete('/:id', allowRoles('admin', 'gerente'), async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM prospectos WHERE id = $1 AND oficina_id = $2',
      [req.params.id, req.user.oficina_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prospecto no encontrado' });
    }

    await registrarHistorial(req, `Se eliminó prospecto id ${req.params.id}`);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar prospecto:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el prospecto' });
  }
});

module.exports = router;
