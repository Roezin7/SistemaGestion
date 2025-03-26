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
    
    // 🚀 Ingreso total: suma de ingresos, abonos y documentos
    const ingresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_ingresos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['ingreso', fechaInicio, fechaFin]
    );
    const abonosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_abonos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['abono', fechaInicio, fechaFin]
    );
    const documentosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_documentos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['documento', fechaInicio, fechaFin]
    );

    const ingreso_total = parseFloat(ingresosResult.rows[0].total_ingresos) 
      + parseFloat(abonosResult.rows[0].total_abonos) 
      + parseFloat(documentosResult.rows[0].total_documentos);

    const abonos_totales = parseFloat(abonosResult.rows[0].total_abonos);
    const documentos_totales = parseFloat(documentosResult.rows[0].total_documentos);

    // 🚀 Egreso total: suma de egresos + retiros
    const egresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_egresos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['egreso', fechaInicio, fechaFin]
    );
    const retirosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_retiros FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['retiro', fechaInicio, fechaFin]
    );
    const egreso_total = parseFloat(egresosResult.rows[0].total_egresos) + parseFloat(retirosResult.rows[0].total_retiros);
    
    // 🚀 Balance general: ingresos - egresos
    const balance_general = ingreso_total - egreso_total;
    
    // 🚀 Trámites mensuales: cantidad de clientes creados en el rango
    const tramitesResult = await db.query(
      'SELECT COUNT(*) as tramites_mensuales FROM clientes WHERE fecha_creacion BETWEEN $1 AND $2',
      [fechaInicio, fechaFin]
    );
    
   // Saldo Restante: Suma de (costo_total_tramite + costo_documentos - total abonos - total ingresos)
    const saldoRestanteResult = await db.query(
      `SELECT COALESCE(SUM(c.costo_total_tramite + c.costo_total_documentos - COALESCE(f.total_abono, 0) - COALESCE(d.total_documento, 0)), 0) as saldo_restante
      FROM clientes c
      LEFT JOIN (
        SELECT client_id, SUM(monto) as total_abono
        FROM finanzas
        WHERE tipo IN ('abono', 'ingreso')
        GROUP BY client_id
      ) f ON c.id = f.client_id
      LEFT JOIN (
        SELECT client_id, SUM(monto) as total_documento
        FROM finanzas
        WHERE tipo = 'documento'
        GROUP BY client_id
      ) d ON c.id = d.client_id`
    );

    res.json({
      ingreso_total,
      abonos_totales,
      documentos_totales,
      egreso_total,
      balance_general,
      tramites_mensuales: tramitesResult.rows[0].tramites_mensuales,
      saldo_restante: saldoRestanteResult.rows[0].saldo_restante
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
