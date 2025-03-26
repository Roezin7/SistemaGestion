const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatesArray(startDate, endDate) {
  const arr = [];
  const dt = new Date(startDate);
  while (dt <= endDate) {
    arr.push(new Date(dt).toISOString().slice(0, 10));
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
      'SELECT COALESCE(SUM(monto), 0) as total_ingresos FROM finanzas WHERE (tipo = $1 OR tipo = $2) AND fecha BETWEEN $3 AND $4',
      ['ingreso', 'abono', fechaInicio, fechaFin]
    );
    const ingreso_total = parseFloat(ingresosResult.rows[0].total_ingresos);

    // Egreso total: suma de egresos + retiros
    const egresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_egresos FROM finanzas WHERE (tipo = $1 OR tipo = $2) AND fecha BETWEEN $3 AND $4',
      ['egreso', 'retiro', fechaInicio, fechaFin]
    );
    const egreso_total = parseFloat(egresosResult.rows[0].total_egresos);

    const balance_general = ingreso_total - egreso_total;

    // Trámites mensuales: cantidad de clientes creados en el rango
    const tramitesResult = await db.query(
      'SELECT COUNT(*) as tramites_mensuales FROM clientes WHERE fecha_creacion BETWEEN $1 AND $2',
      [fechaInicio, fechaFin]
    );

    // Saldo Restante: suma de (costo_total_tramite - total abonos)
    const saldoRestanteResult = await db.query(
      `SELECT COALESCE(SUM(c.costo_total_tramite - COALESCE(f.total_abono, 0)), 0) as saldo_restante
       FROM clientes c
       LEFT JOIN (
         SELECT client_id, SUM(monto) as total_abono
         FROM finanzas
         WHERE tipo IN ('abono', 'ingreso')
         GROUP BY client_id
       ) f ON c.id = f.client_id`
    );

    const saldo_restante = parseFloat(saldoRestanteResult.rows[0].saldo_restante);

    res.json({
      ingreso_total: ingreso_total || 0,
      egreso_total: egreso_total || 0,
      balance_general: balance_general || 0,
      tramites_mensuales: parseInt(tramitesResult.rows[0].tramites_mensuales) || 0,
      saldo_restante: saldo_restante || 0,
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

    const datesArray = getDatesArray(fechaInicio, fechaFin);

    // Ingresos y Abonos
    const ingresosQuery = await db.query(
      `SELECT TO_CHAR(fecha, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_ingreso 
       FROM finanzas 
       WHERE tipo IN ('ingreso', 'abono') 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha 
       ORDER BY fecha ASC`,
      [fechaInicio, fechaFin]
    );

    // Egresos y Retiros
    const egresosQuery = await db.query(
      `SELECT TO_CHAR(fecha, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_egreso 
       FROM finanzas 
       WHERE tipo IN ('egreso', 'retiro') 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha 
       ORDER BY fecha ASC`,
      [fechaInicio, fechaFin]
    );

    // Trámites Diarios
    const tramitesQuery = await db.query(
      `SELECT TO_CHAR(fecha_creacion, 'YYYY-MM-DD') as fecha, COUNT(*) as total_tramites 
       FROM clientes 
       WHERE fecha_creacion BETWEEN $1 AND $2 
       GROUP BY fecha_creacion 
       ORDER BY fecha_creacion ASC`,
      [fechaInicio, fechaFin]
    );

    const ingresosData = {};
    const egresosData = {};
    const tramitesData = {};

    ingresosQuery.rows.forEach(row => {
      ingresosData[row.fecha] = parseFloat(row.total_ingreso);
    });

    egresosQuery.rows.forEach(row => {
      egresosData[row.fecha] = parseFloat(row.total_egreso);
    });

    tramitesQuery.rows.forEach(row => {
      tramitesData[row.fecha] = parseInt(row.total_tramites);
    });

    const ingresosArray = datesArray.map(date => ingresosData[date] || 0);
    const egresosArray = datesArray.map(date => egresosData[date] || 0);
    const tramitesArray = datesArray.map(date => tramitesData[date] || 0);

    res.json({
      labels: datesArray,
      ingresos: ingresosArray,
      egresos: egresosArray,
      tramites: tramitesArray,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
