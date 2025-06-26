// src/routes/finanzas.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken } = require('../routes/auth');

// 2.1) Registrar cualquier transacción (ingreso, egreso, abono, documento, etc.)
router.post('/', verificarToken, async (req, res) => {
  const { tipo, concepto, fecha, monto, client_id, forma_pago } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO finanzas (tipo, concepto, fecha, monto, client_id, forma_pago)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [tipo, concepto, fecha, monto, client_id || null, forma_pago]
    );
    await registrarHistorial(req, `Se registró ${tipo} id ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2) Listar transacciones con filtro de fechas
router.get('/reportes', verificarToken, async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);
  try {
    const result = await db.query(
      `SELECT * FROM finanzas
       WHERE fecha BETWEEN $1 AND $2
       ORDER BY fecha ASC`,
      [fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.3) Últimas 10 transacciones en un rango
router.get('/ultimas', verificarToken, async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);
  try {
    const result = await db.query(
      `SELECT * FROM finanzas
       WHERE fecha BETWEEN $1 AND $2
       ORDER BY fecha DESC
       LIMIT 10`,
      [fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.4) Historial de abonos/ingresos por cliente
router.get('/abonos/:clientId', verificarToken, async (req, res) => {
  const { clientId } = req.params;
  try {
    const total = await db.query(
      `SELECT COALESCE(SUM(monto),0) AS total_abono
       FROM finanzas
       WHERE (tipo='abono' OR tipo='ingreso') AND client_id = $1`,
      [clientId]
    );
    const list = await db.query(
      `SELECT id, tipo, concepto, fecha, monto, forma_pago
       FROM finanzas
       WHERE (tipo='abono' OR tipo='ingreso') AND client_id = $1
       ORDER BY fecha ASC`,
      [clientId]
    );
    res.json({
      total_abono: total.rows[0].total_abono,
      abonos: list.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5) Historial de documentos por cliente
router.get('/documentos/:clientId', verifyingToken, async (req, res) => {
  const { clientId } = req.params;
  try {
    const total = await db.query(
      `SELECT COALESCE(SUM(monto),0) AS total_documento
       FROM finanzas
       WHERE tipo='documento' AND client_id = $1`,
      [clientId]
    );
    const list = await db.query(
      `SELECT id, concepto, fecha, monto, forma_pago
       FROM finanzas
       WHERE tipo='documento' AND client_id = $1
       ORDER BY fecha ASC`,
      [clientId]
    );
    res.json({
      total_documento: total.rows[0].total_documento,
      documentos: list.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.6) Eliminar cualquier transacción
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM finanzas WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó transacción id ${id}`);
    res.json({ message: 'Transacción eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.7) Actualizar transacción existente
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { tipo, concepto, fecha, monto, client_id, forma_pago } = req.body;
  try {
    const result = await db.query(
      `UPDATE finanzas SET
         tipo       = COALESCE($1, tipo),
         concepto   = COALESCE($2, concepto),
         fecha      = COALESCE($3, fecha),
         monto      = COALESCE($4, monto),
         client_id  = COALESCE($5, client_id),
         forma_pago = COALESCE($6, forma_pago)
       WHERE id = $7
       RETURNING *`,
      [tipo, concepto, fecha, monto, client_id || null, forma_pago, id]
    );
    await registrarHistorial(req, `Se actualizó transacción id ${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.8) Registrar retiros de socios
router.post('/retiros', verificarToken, async (req, res) => {
  const { socio, monto, fecha } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO retiros_socios (socio, monto, fecha)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [socio, monto, fecha]
    );
    await registrarHistorial(req, `Se registró retiro ${socio} id ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.9) Obtener reparto de utilidades
router.get('/reparto', verificarToken, async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);

  try {
    const ing = await db.query(
      `SELECT COALESCE(SUM(monto),0) AS total_ingresos
       FROM finanzas
       WHERE tipo='ingreso' AND fecha BETWEEN $1 AND $2`,
      [fechaInicio, fechaFin]
    );
    const eg = await db.query(
      `SELECT COALESCE(SUM(monto),0) AS total_egresos
       FROM finanzas
       WHERE tipo='egreso' AND fecha BETWEEN $1 AND $2`,
      [fechaInicio, fechaFin]
    );

    const totalIngresos = parseFloat(ing.rows[0].total_ingresos);
    const totalEgresos  = parseFloat(eg.rows[0].total_egresos);
    const utilidadNeta  = totalIngresos - totalEgresos;
    const mitad         = utilidadNeta / 2;

    const retiros = await db.query(
      `SELECT socio, COALESCE(SUM(monto),0) AS total_retirado
       FROM retiros_socios
       WHERE fecha BETWEEN $1 AND $2
       GROUP BY socio`,
      [fechaInicio, fechaFin]
    );

    let retiradoLiz = 0, retiradoAlberto = 0;
    retiros.rows.forEach(r => {
      if (r.socio === 'Liz')     retiradoLiz     = parseFloat(r.total_retirado);
      if (r.socio === 'Alberto') retiradoAlberto = parseFloat(r.total_retirado);
    });

    const parteLiz     = mitad - retiradoLiz;
    const parteAlberto = mitad - retiradoAlberto;

    res.json({ utilidadNeta, parteLiz, parteAlberto, retiradoLiz, retiradoAlberto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.10) Listar retiros en rango
router.get('/retiros', verificarToken, async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);

  try {
    const result = await db.query(
      `SELECT id, socio, monto, fecha
       FROM retiros_socios
       WHERE fecha BETWEEN $1 AND $2
       ORDER BY fecha DESC`,
      [fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.11) Eliminar un retiro
router.delete('/retiros/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM retiros_socios WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó retiro id ${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
