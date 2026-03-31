const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken } = require('../middleware');

function getDatesArray(startDate, endDate) {
  const arr = [];
  const dt = new Date(startDate);
  while (dt <= endDate) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

function normalizarFecha(valor) {
  if (!valor) {
    return '';
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  return String(valor).slice(0, 10);
}

// Endpoint principal de KPIs
router.get('/', verificarToken, async (req, res) => {
  try {
    let { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || fechaInicio.trim() === '') {
      fechaInicio = '1970-01-01';
    }
    if (!fechaFin || fechaFin.trim() === '') {
      fechaFin = new Date().toISOString().slice(0, 10);
    }

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

    const ingreso_total =
      parseFloat(ingresosResult.rows[0].total_ingresos) +
      parseFloat(abonosResult.rows[0].total_abonos) +
      parseFloat(documentosResult.rows[0].total_documentos);

    const abonos_totales = parseFloat(abonosResult.rows[0].total_abonos);
    const documentos_totales = parseFloat(documentosResult.rows[0].total_documentos);

    const egresosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_egresos FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['egreso', fechaInicio, fechaFin]
    );
    const retirosResult = await db.query(
      'SELECT COALESCE(SUM(monto), 0) as total_retiros FROM finanzas WHERE tipo = $1 AND fecha BETWEEN $2 AND $3',
      ['retiro', fechaInicio, fechaFin]
    );
    const egreso_total =
      parseFloat(egresosResult.rows[0].total_egresos) +
      parseFloat(retirosResult.rows[0].total_retiros);

    const balance_general = ingreso_total - egreso_total;

    const tramitesResult = await db.query(
      'SELECT COUNT(*) as tramites_mensuales FROM clientes WHERE fecha_creacion::date BETWEEN $1 AND $2',
      [fechaInicio, fechaFin]
    );

    const saldoRestanteResult = await db.query(
      `SELECT COALESCE(SUM(
          COALESCE(c.costo_total_tramite, 0)
          + COALESCE(c.costo_total_documentos, 0)
          - COALESCE(c.abono_inicial, 0)
          - COALESCE(f.total_abono, 0)
        ), 0) as saldo_restante
       FROM clientes c
       LEFT JOIN (
         SELECT client_id, SUM(monto) as total_abono
         FROM finanzas
         WHERE tipo IN ('abono', 'ingreso', 'documento')
         GROUP BY client_id
       ) f ON c.id = f.client_id`
    );

    // ingresos por forma de pago
    const formaPagoResult = await db.query(
      `SELECT forma_pago, SUM(monto) AS total
       FROM finanzas
       WHERE tipo = 'ingreso' AND fecha BETWEEN $1 AND $2
       GROUP BY forma_pago`,
      [fechaInicio, fechaFin]
    );
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    formaPagoResult.rows.forEach(row => {
      if (row.forma_pago === 'efectivo') {
        totalEfectivo = parseFloat(row.total);
      }
      if (row.forma_pago === 'transferencia') {
        totalTransferencia = parseFloat(row.total);
      }
    });

    res.json({
      totalEfectivo,
      totalTransferencia,
      ingreso_total,
      abonos_totales,
      documentos_totales,
      egreso_total,
      balance_general,
      tramites_mensuales: parseInt(tramitesResult.rows[0].tramites_mensuales, 10) || 0,
      saldo_restante: parseFloat(saldoRestanteResult.rows[0].saldo_restante) || 0,
    });
  } catch (err) {
    console.error('Error en /api/kpis:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para el gráfico de KPIs
router.get('/chart', verificarToken, async (req, res) => {
  try {
    let { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || fechaInicio.trim() === '') {
      fechaInicio = '1970-01-01';
    }
    if (!fechaFin || fechaFin.trim() === '') {
      fechaFin = new Date().toISOString().slice(0, 10);
    }

    // Datos diarios de ingresos
    const ingresosQuery = await db.query(
      `SELECT fecha, SUM(monto) as total
       FROM finanzas
       WHERE tipo = 'ingreso' AND fecha BETWEEN $1 AND $2
       GROUP BY fecha
       ORDER BY fecha`,
      [fechaInicio, fechaFin]
    );

    // Datos diarios de egresos
    const egresosQuery = await db.query(
      `SELECT fecha, SUM(monto) as total
       FROM finanzas
       WHERE tipo = 'egreso' AND fecha BETWEEN $1 AND $2
       GROUP BY fecha
       ORDER BY fecha`,
      [fechaInicio, fechaFin]
    );

    // Datos diarios de trámites
    const tramitesQuery = await db.query(
      `SELECT fecha_creacion::date as fecha, COUNT(*) as total
       FROM clientes
       WHERE fecha_creacion::date BETWEEN $1 AND $2
       GROUP BY fecha_creacion::date
       ORDER BY fecha_creacion::date`,
      [fechaInicio, fechaFin]
    );

    // Repetimos el cálculo de ingresos por forma de pago aquí
    const formaPagoResult = await db.query(
      `SELECT forma_pago, SUM(monto) AS total
       FROM finanzas
       WHERE tipo = 'ingreso' AND fecha BETWEEN $1 AND $2
       GROUP BY forma_pago`,
      [fechaInicio, fechaFin]
    );
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    formaPagoResult.rows.forEach(row => {
      if (row.forma_pago === 'efectivo') {
        totalEfectivo = parseFloat(row.total);
      }
      if (row.forma_pago === 'transferencia') {
        totalTransferencia = parseFloat(row.total);
      }
    });

    const labels = getDatesArray(new Date(fechaInicio), new Date(fechaFin))
      .map((date) => date.toISOString().slice(0, 10));

    const ingresosPorFecha = new Map(
      ingresosQuery.rows.map((row) => [normalizarFecha(row.fecha), parseFloat(row.total)])
    );
    const egresosPorFecha = new Map(
      egresosQuery.rows.map((row) => [normalizarFecha(row.fecha), parseFloat(row.total)])
    );
    const tramitesPorFecha = new Map(
      tramitesQuery.rows.map((row) => [normalizarFecha(row.fecha), parseInt(row.total, 10)])
    );

    const ingresos = labels.map((label) => ingresosPorFecha.get(label) || 0);
    const egresos = labels.map((label) => egresosPorFecha.get(label) || 0);
    const tramites = labels.map((label) => tramitesPorFecha.get(label) || 0);

    res.json({
      totalEfectivo,
      totalTransferencia,
      labels,
      ingresos,
      egresos,
      tramites
    });
  } catch (err) {
    console.error('Error en /api/kpis/chart:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
