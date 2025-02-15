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
    
    // Saldo Restante: Suma, para cada cliente, de (costo_total_tramite - total abonos)
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
      tramites_mensuales: tramitesResult.rows[0].tramites_mensuales,
      saldo_restante: saldoRestanteResult.rows[0].saldo_restante
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

    console.log(`Consultando datos desde ${fechaInicio} hasta ${fechaFin}`);

    // Generar array de fechas con formato `YYYY-MM-DD`
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    const datesArray = [];
    const current = new Date(start);
    while (current <= end) {
      datesArray.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    console.log("Fechas generadas:", datesArray);

    // 🚀 **Consulta de ingresos y abonos**
    const ingresosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_ingreso 
       FROM finanzas 
       WHERE tipo = 'ingreso' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    const abonosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_abono 
       FROM finanzas 
       WHERE tipo = 'abono' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    console.log("Resultados de ingresos:", ingresosQuery.rows);
    console.log("Resultados de abonos:", abonosQuery.rows);

    const ingresosData = {};
    const abonosData = {};
    ingresosQuery.rows.forEach(row => {
      ingresosData[row.fecha] = parseFloat(row.total_ingreso);
    });
    abonosQuery.rows.forEach(row => {
      abonosData[row.fecha] = parseFloat(row.total_abono);
    });

    // 🚀 **Consulta de egresos y retiros**
    const egresosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_egreso 
       FROM finanzas 
       WHERE tipo = 'egreso' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    const retirosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_retiro 
       FROM finanzas 
       WHERE tipo = 'retiro' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    console.log("Resultados de egresos:", egresosQuery.rows);
    console.log("Resultados de retiros:", retirosQuery.rows);

    const egresosData = {};
    const retirosData = {};
    egresosQuery.rows.forEach(row => {
      egresosData[row.fecha] = parseFloat(row.total_egreso);
    });
    retirosQuery.rows.forEach(row => {
      retirosData[row.fecha] = parseFloat(row.total_retiro);
    });

    // 🚀 **Consulta de trámites diarios**
    const tramitesQuery = await db.query(
      `SELECT TO_CHAR(fecha_creacion::date, 'YYYY-MM-DD') as fecha, COUNT(*) as total_tramites 
       FROM clientes 
       WHERE fecha_creacion::date BETWEEN $1 AND $2 
       GROUP BY fecha_creacion::date 
       ORDER BY fecha_creacion::date ASC`,
      [fechaInicio, fechaFin]
    );

    console.log("Resultados de trámites:", tramitesQuery.rows);

    const tramitesData = {};
    tramitesQuery.rows.forEach(row => {
      tramitesData[row.fecha] = parseInt(row.total_tramites);
    });

    // Mapear los resultados en el array de fechas
    const ingresosArray = datesArray.map(date => (ingresosData[date] || 0) + (abonosData[date] || 0));
    const egresosArray = datesArray.map(date => (egresosData[date] || 0) + (retirosData[date] || 0));
    const tramitesArray = datesArray.map(date => tramitesData[date] || 0);

    console.log("Ingresos finales:", ingresosArray);
    console.log("Egresos finales:", egresosArray);
    console.log("Trámites finales:", tramitesArray);

    res.json({
      labels: datesArray,
      ingresos: ingresosArray,
      egresos: egresosArray,
      tramites: tramitesArray,
    });
  } catch (err) {
    console.error("Error en /chart:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
