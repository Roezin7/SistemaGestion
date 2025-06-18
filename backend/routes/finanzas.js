// 2) Backend completo: routes/finanzas.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken } = require('../routes/auth');

// 2.1) Registrar cualquier transacción (ingreso, egreso, etc.)
router.post('/', verificarToken, async (req, res) => {
  const { tipo, concepto, fecha, monto, client_id, forma_pago } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO finanzas (tipo, concepto, fecha, monto, client_id, forma_pago) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [tipo, concepto, fecha, monto, client_id || null, forma_pago]
    );
    await registrarHistorial(req, `Se registró ${tipo} id ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2) Listar transacciones con filtro
router.get('/reportes', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);
  try {
    const result = await db.query(
      'SELECT * FROM finanzas WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha ASC',
      [fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.3) Últimas transacciones
router.get('/ultimas', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);
  try {
    const result = await db.query(
      'SELECT * FROM finanzas WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha ASC',
      [fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.4) Historial de abonos por cliente
router.get('/abonos/:clientId', verificarToken, async (req, res) => {
  const { clientId } = req.params;
  try {
    const total = await db.query(
      "SELECT COALESCE(SUM(monto),0) as total_abono FROM finanzas WHERE (tipo='abono' OR tipo='ingreso') AND client_id=$1",
      [clientId]
    );
    const list = await db.query(
      "SELECT id, tipo, concepto, fecha, monto, forma_pago FROM finanzas WHERE (tipo='abono' OR tipo='ingreso') AND client_id=$1 ORDER BY fecha ASC",
      [clientId]
    );
    res.json({ total_abono: total.rows[0].total_abono, abonos: list.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5) Historial de documentos por cliente
router.get('/documentos/:clientId', verificarToken, async (req, res) => {
  const { clientId } = req.params;
  try {
    const total = await db.query(
      "SELECT COALESCE(SUM(monto),0) as total_documento FROM finanzas WHERE tipo='documento' AND client_id=$1",
      [clientId]
    );
    const list = await db.query(
      "SELECT id, concepto, fecha, monto, forma_pago FROM finanzas WHERE tipo='documento' AND client_id=$1 ORDER BY fecha ASC",
      [clientId]
    );
    res.json({ total_documento: total.rows[0].total_documento, documentos: list.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.6) Eliminar transacción
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM finanzas WHERE id=$1', [id]);
    await registrarHistorial(req, `Se eliminó transacción id ${id}`);
    res.json({ message: 'Eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NUEVO ──
// 2.7) Registrar retiros de socio
router.post('/retiros', verificarToken, async (req, res) => {
  const { socio, monto, fecha } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO retiros_socios (socio, monto, fecha) VALUES ($1,$2,$3) RETURNING *',
      [socio, monto, fecha]
    );
    await registrarHistorial(req, `Se registró retiro de ${socio} id ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.8) Obtener reparto de utilidades
router.get('/reparto', verificarToken, async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin)    fechaFin    = new Date().toISOString().slice(0,10);

  try {
    // total ingresos y egresos
    const ing = await db.query(
      "SELECT COALESCE(SUM(monto),0) AS total_ingresos FROM finanzas WHERE tipo='ingreso' AND fecha BETWEEN $1 AND $2",
      [fechaInicio, fechaFin]
    );
    const eg = await db.query(
      "SELECT COALESCE(SUM(monto),0) AS total_egresos  FROM finanzas WHERE tipo='egreso'  AND fecha BETWEEN $1 AND $2",
      [fechaInicio, fechaFin]
    );

    const totalIngresos = parseFloat(ing.rows[0].total_ingresos);
    const totalEgresos  = parseFloat(eg.rows[0].total_egresos);
    const utilidadNeta  = totalIngresos - totalEgresos;
    const mitad         = utilidadNeta / 2;

    // retiros por socio
    const retiros = await db.query(
      "SELECT socio, COALESCE(SUM(monto),0) AS total_retirado FROM retiros_socios WHERE fecha BETWEEN $1 AND $2 GROUP BY socio",
      [fechaInicio, fechaFin]
    );
    let retiradoLiz = 0, retiradoAlberto = 0;
    retiros.rows.forEach(r => {
      if (r.socio === 'Liz')      retiradoLiz      = parseFloat(r.total_retirado);
      if (r.socio === 'Alberto')  retiradoAlberto  = parseFloat(r.total_retirado);
    });

    const parteLiz     = mitad - retiradoLiz;
    const parteAlberto = mitad - retiradoAlberto;

    res.json({ utilidadNeta, parteLiz, parteAlberto, retiradoLiz, retiradoAlberto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.9) Listar retiros en el rango dado
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

// 2.10) Eliminar un retiro existente
router.delete('/retiros/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      'DELETE FROM retiros_socios WHERE id = $1',
      [id]
    );
    await registrarHistorial(req, `Se eliminó retiro id ${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
