const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatesArray(startDate, endDate) {
  const arr = [];
  const dt = new Date(startDate);
  while (dt <= endDate) {
    arr.push(new Date(dt).toISOString().slice(0, 10)); // Asegurando el formato YYYY-MM-DD
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

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
    const datesArray = getDatesArray(fechaInicio, fechaFin);

    // 🚀 **Consulta de ingresos**
    const ingresosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_ingreso 
       FROM finanzas 
       WHERE tipo = 'ingreso' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    // 🚀 **Consulta de abonos**
    const abonosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_abono 
       FROM finanzas 
       WHERE tipo = 'abono' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    // 🚀 **Consulta de egresos**
    const egresosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_egreso 
       FROM finanzas 
       WHERE tipo = 'egreso' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    // 🚀 **Consulta de retiros**
    const retirosQuery = await db.query(
      `SELECT TO_CHAR(fecha::date, 'YYYY-MM-DD') as fecha, COALESCE(SUM(monto), 0) as total_retiro 
       FROM finanzas 
       WHERE tipo = 'retiro' 
       AND fecha BETWEEN $1 AND $2 
       GROUP BY fecha::date 
       ORDER BY fecha::date ASC`,
      [fechaInicio, fechaFin]
    );

    // 🚀 **Consulta de trámites**
    const tramitesQuery = await db.query(
      `SELECT TO_CHAR(fecha_creacion::date, 'YYYY-MM-DD') as fecha, COUNT(*) as total_tramites 
       FROM clientes 
       WHERE fecha_creacion::date BETWEEN $1 AND $2 
       GROUP BY fecha_creacion::date 
       ORDER BY fecha_creacion::date ASC`,
      [fechaInicio, fechaFin]
    );

    const ingresosData = {};
    const abonosData = {};
    const egresosData = {};
    const retirosData = {};
    const tramitesData = {};

    // Procesar resultados de ingresos
    ingresosQuery.rows.forEach(row => {
      ingresosData[row.fecha] = parseFloat(row.total_ingreso);
    });

    // Procesar resultados de abonos
    abonosQuery.rows.forEach(row => {
      abonosData[row.fecha] = parseFloat(row.total_abono);
    });

    // Procesar resultados de egresos
    egresosQuery.rows.forEach(row => {
      egresosData[row.fecha] = parseFloat(row.total_egreso);
    });

    // Procesar resultados de retiros
    retirosQuery.rows.forEach(row => {
      retirosData[row.fecha] = parseFloat(row.total_retiro);
    });

    // Procesar resultados de trámites
    tramitesQuery.rows.forEach(row => {
      tramitesData[row.fecha] = parseInt(row.total_tramites);
    });

    // Mapear los resultados en el array de fechas
    const ingresosArray = datesArray.map(date => (ingresosData[date] || 0) + (abonosData[date] || 0));
    const egresosArray = datesArray.map(date => (egresosData[date] || 0) + (retirosData[date] || 0));
    const tramitesArray = datesArray.map(date => tramitesData[date] || 0);

    console.log("Fechas:", datesArray);
    console.log("Ingresos:", ingresosArray);
    console.log("Egresos:", egresosArray);
    console.log("Trámites:", tramitesArray);

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
