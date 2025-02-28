// backend/routes/finanzas.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken } = require('../routes/auth'); // Usamos el middleware de auth

// Registrar un ingreso, egreso, abono o retiro (protegido)
router.post('/', verificarToken, async (req, res) => {
  const { tipo, concepto, fecha, monto, client_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO finanzas (tipo, concepto, fecha, monto, client_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tipo, concepto, fecha, monto, client_id || null]
    );
    const nuevaTransaccion = result.rows[0];
    await registrarHistorial(req, `Se registró una transacción (${tipo}) con id ${nuevaTransaccion.id}`);
    res.json(nuevaTransaccion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener reportes financieros con filtros de fecha (se puede dejar público o protegerlo si se requiere)
router.get('/reportes', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio || fechaInicio.trim() === '') {
    fechaInicio = '1970-01-01';
  }
  if (!fechaFin || fechaFin.trim() === '') {
    fechaFin = new Date().toISOString().slice(0, 10);
  }
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

// Obtener las últimas transacciones (se puede dejar público)
router.get('/ultimas', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM finanzas ORDER BY fecha DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener historial de abonos para un cliente (se puede dejar público)
router.get('/abonos/:clientId', async (req, res) => {
  const { clientId } = req.params;
  try {
    const result = await db.query(
      "SELECT COALESCE(SUM(monto), 0) as total_abono FROM finanzas WHERE tipo = 'abono' AND client_id = $1",
      [clientId]
    );
    const listResult = await db.query(
      "SELECT id, concepto, fecha, monto FROM finanzas WHERE tipo = 'abono' AND client_id = $1 ORDER BY fecha ASC",
      [clientId]
    );
    res.json({ total_abono: result.rows[0].total_abono, abonos: listResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar una transacción (protegido)
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM finanzas WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó la transacción con id ${id}`);
    res.json({ message: 'Transacción eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar una transacción existente (protegido)
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { tipo, concepto, fecha, monto, client_id } = req.body;
  try {
    const result = await db.query(
      'UPDATE finanzas SET tipo = $1, concepto = $2, fecha = $3, monto = $4, client_id = $5 WHERE id = $6 RETURNING *',
      [tipo, concepto, fecha, monto, client_id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    await registrarHistorial(req, `Se actualizó la transacción con id ${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
