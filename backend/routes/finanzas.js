// backend/routes/finanzas.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Registrar un ingreso, egreso, abono o retiro
router.post('/', async (req, res) => {
  const { tipo, concepto, fecha, monto, client_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO finanzas (tipo, concepto, fecha, monto, client_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tipo, concepto, fecha, monto, client_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener reportes financieros con filtros de fecha
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

// Obtener las últimas transacciones (los 10 más recientes)
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

// Obtener historial de abonos para un cliente
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

// Eliminar una transacción
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM finanzas WHERE id = $1', [id]);
    res.json({ message: 'Transacción eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;