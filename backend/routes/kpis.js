const express = require('express');
const router = express.Router();
const db = require('../db');

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
    const ingreso_total = parseFloat(ingresosResult.rows[0]?.total_ingresos || 0) + parseFloat(abonosResult.rows[0]?.total_abonos || 0);
    const abonos_totales = parseFloat(abonosResult.rows[0]?.total_abonos || 0);

    // Egreso total: suma de egresos + retiros
    const egresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_egresos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['egreso', fechaInicio, fechaFin]
    );
    const retirosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_retiros FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['retiro', fechaInicio, fechaFin]
    );
    const egreso_total = parseFloat(egresosResult.rows[0]?.total_egresos || 0) + parseFloat(retirosResult.rows[0]?.total_retiros || 0);

    const balance_general = ingreso_total - egreso_total;

    // Trámites mensuales: cantidad de clientes creados en el rango
    const tramitesResult = await db.query(
      'SELECT COUNT(*) as tramites_mensuales FROM clientes WHERE fecha_creacion BETWEEN $1 AND $2',
      [fechaInicio, fechaFin]
    );

    // Saldo Restante: cálculo robusto con validación
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
    const saldo_restante = parseFloat(saldoRestanteResult.rows[0]?.saldo_restante || 0);

    res.json({
      ingreso_total,
      abonos_totales,
      egreso_total,
      balance_general,
      tramites_mensuales: parseInt(tramitesResult.rows[0]?.tramites_mensuales || 0),
      saldo_restante
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
