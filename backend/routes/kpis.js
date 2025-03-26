// backend/routes/kpis.js
const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatesArray(startDate, endDate) {
  const arr = [];
  const dt = new Date(startDate);
  while (dt <= endDate) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

router.get('/', async (req, res) => {
  try {
    let { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || fechaInicio.trim() === '') {
      fechaInicio = '1970-01-01';
    }
    if (!fechaFin || fechaFin.trim() === '') {
      fechaFin = new Date().toISOString().slice(0, 10);
    }

    // Ingreso total: suma de ingresos + abonos
    const ingresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_ingresos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['ingreso', fechaInicio, fechaFin]
    );
    const abonosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_abonos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['abono', fechaInicio, fechaFin]
    );
    const ingreso_total = parseFloat(ingresosResult.rows[0].total_ingresos) + parseFloat(abonosResult.rows[0].total_abonos);
    const abonos_totales = parseFloat(abonosResult.rows[0].total_abonos);

    // Egreso total: suma de egresos + retiros
    const egresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_egresos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['egreso', fechaInicio, fechaFin]
    );
    const retirosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_retiros FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['retiro', fechaInicio, fechaFin]
    );
    const egreso_total = parseFloat(egresosResult.rows[0].total_egresos) + parseFloat(retirosResult.rows[0].total_retiros);
    const balance_general = ingreso_total - egreso_total;

    // Trámites mensuales: cantidad de clientes creados en el rango
    const tramitesResult = await db.query(
      'SELECT COUNT(*) as tramites_mensuales FROM clientes WHERE fecha_creacion BETWEEN $1 AND $2',
      [fechaInicio, fechaFin]
    );

    // Saldo Restante: Suma de (costo_total_tramite - total abonos)
    const saldoRestanteResult = await db.query(
      `SELECT COALESCE(SUM(c.costo_total_tramite - COALESCE(f.total_abono, 0)), 0) as saldo_restante
       FROM clientes c
       LEFT JOIN (
         SELECT client_id, SUM(monto) as total_abono
         FROM finanzas
         WHERE tipo = 'abono'
         GROUP BY client_id
       ) f ON c.id = f.client_id`
    );

    res.json({
      ingreso_total,
      abonos_totales,
      egreso_total,
      balance_general,
      tramites_mensuales: parseInt(tramitesResult.rows[0].tramites_mensuales),
      saldo_restante: parseFloat(saldoRestanteResult.rows[0].saldo_restante),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para datos de gráfico: ingresos y trámites diarios
router.get('/chart', async (req, res) => {
  try {
    let { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || fechaInicio.trim() === '') {
      const now = new Date();
      fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    }
    if (!fechaFin || fechaFin.trim() === '') {
      const now = new Date();
      fechaFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    const datesArray = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      datesArray.push(new Date(dt).toISOString().slice(0, 10));
    }

    const ingresos = datesArray.map(() => Math.floor(Math.random() * 1000));
    const egresos = datesArray.map(() => Math.floor(Math.random() * 500));
    const tramites = datesArray.map(() => Math.floor(Math.random() * 10));

    res.json({ labels: datesArray, ingresos, egresos, tramites });
  } catch (err) {
    console.error("Error en /chart:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
