// src/routes/finanzas.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken } = require('../middleware');

function normalizarTipo(tipo) {
  if (tipo === 'documentos') {
    return 'documento';
  }
  return tipo;
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarClientId(valor) {
  if (valor === '' || valor === null || typeof valor === 'undefined') {
    return null;
  }

  const clientId = Number.parseInt(valor, 10);
  return Number.isNaN(clientId) ? null : clientId;
}

async function validarClienteDeLaOficina(clientId, oficinaId) {
  if (!clientId) {
    return null;
  }

  const result = await db.query(
    'SELECT id, nombre FROM clientes WHERE id = $1 AND oficina_id = $2',
    [clientId, oficinaId]
  );

  return result.rows[0] || null;
}

router.use(verificarToken);

router.use((req, res, next) => {
  const rol = req.user?.rol;

  if (rol === 'admin' || rol === 'gerente') return next();

  if (rol === 'empleado') {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'POST') return next();
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: como empleado solo puedes ver y agregar en Finanzas.',
    });
  }

  return res.status(403).json({ success: false, message: 'Acceso denegado.' });
});

router.post('/', async (req, res) => {
  const tipoNormalizado = normalizarTipo(req.body.tipo);
  const concepto = normalizarTexto(req.body.concepto);
  const fecha = req.body.fecha;
  const monto = Number.parseFloat(req.body.monto);
  const clientId = normalizarClientId(req.body.client_id);
  const formaPago = normalizarTexto(req.body.forma_pago) || 'efectivo';

  if (!tipoNormalizado || !concepto || !fecha || Number.isNaN(monto) || monto <= 0) {
    return res.status(400).json({ error: 'Tipo, concepto, fecha y un monto mayor a cero son obligatorios.' });
  }

  if ((tipoNormalizado === 'abono' || tipoNormalizado === 'documento') && !clientId) {
    return res.status(400).json({ error: 'Debes seleccionar un cliente para registrar abonos o documentos.' });
  }

  try {
    if (clientId) {
      const cliente = await validarClienteDeLaOficina(clientId, req.user.oficina_id);
      if (!cliente) {
        return res.status(400).json({ error: 'El cliente seleccionado no pertenece a esta oficina.' });
      }
    }

    const result = await db.query(
      `INSERT INTO finanzas
         (oficina_id, tipo, concepto, fecha, monto, client_id, forma_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.oficina_id, tipoNormalizado, concepto, fecha, monto, clientId, formaPago]
    );
    await registrarHistorial(req, `Se registró ${tipoNormalizado} id ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al registrar transacción:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/reportes', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin) fechaFin = new Date().toISOString().slice(0, 10);
  try {
    const result = await db.query(
      `SELECT
         f.*,
         c.nombre AS cliente_nombre,
         c.numero_recibo
       FROM finanzas f
       LEFT JOIN clientes c ON c.id = f.client_id AND c.oficina_id = f.oficina_id
       WHERE f.oficina_id = $1
         AND f.fecha BETWEEN $2 AND $3
       ORDER BY f.fecha ASC, f.id ASC`,
      [req.user.oficina_id, fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener reportes de finanzas:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ultimas', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin) fechaFin = new Date().toISOString().slice(0, 10);
  try {
    const result = await db.query(
      `SELECT
         f.*,
         c.nombre AS cliente_nombre,
         c.numero_recibo
       FROM finanzas f
       LEFT JOIN clientes c ON c.id = f.client_id AND c.oficina_id = f.oficina_id
       WHERE f.oficina_id = $1
         AND f.fecha BETWEEN $2 AND $3
       ORDER BY f.fecha DESC, f.id DESC`,
      [req.user.oficina_id, fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener últimas transacciones:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/abonos/:clientId', async (req, res) => {
  const clientId = normalizarClientId(req.params.clientId);
  try {
    const cliente = await validarClienteDeLaOficina(clientId, req.user.oficina_id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const total = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_abono
       FROM finanzas
       WHERE oficina_id = $1
         AND client_id = $2
         AND tipo IN ('abono', 'ingreso')`,
      [req.user.oficina_id, clientId]
    );
    const list = await db.query(
      `SELECT id, tipo, concepto, fecha, monto, forma_pago
       FROM finanzas
       WHERE oficina_id = $1
         AND client_id = $2
         AND tipo IN ('abono', 'ingreso')
       ORDER BY fecha ASC, id ASC`,
      [req.user.oficina_id, clientId]
    );
    res.json({ total_abono: total.rows[0].total_abono, abonos: list.rows });
  } catch (err) {
    console.error('Error al obtener abonos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/documentos/:clientId', async (req, res) => {
  const clientId = normalizarClientId(req.params.clientId);
  try {
    const cliente = await validarClienteDeLaOficina(clientId, req.user.oficina_id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const total = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_documento
       FROM finanzas
       WHERE oficina_id = $1
         AND client_id = $2
         AND tipo = 'documento'`,
      [req.user.oficina_id, clientId]
    );
    const list = await db.query(
      `SELECT id, concepto, fecha, monto, forma_pago
       FROM finanzas
       WHERE oficina_id = $1
         AND client_id = $2
         AND tipo = 'documento'
       ORDER BY fecha ASC, id ASC`,
      [req.user.oficina_id, clientId]
    );
    res.json({ total_documento: total.rows[0].total_documento, documentos: list.rows });
  } catch (err) {
    console.error('Error al obtener cargos por documentos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/abonos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `DELETE FROM finanzas
       WHERE id = $1
         AND oficina_id = $2
         AND tipo IN ('abono', 'ingreso')
       RETURNING id`,
      [id, req.user.oficina_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Abono no encontrado' });
    }
    await registrarHistorial(req, `Se eliminó abono/transacción id ${id}`);
    res.json({ message: 'Abono eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar abono:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM finanzas WHERE id = $1 AND oficina_id = $2 RETURNING id',
      [id, req.user.oficina_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    await registrarHistorial(req, `Se eliminó transacción id ${id}`);
    res.json({ message: 'Transacción eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar transacción:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const actual = await db.query(
      'SELECT * FROM finanzas WHERE id = $1 AND oficina_id = $2',
      [id, req.user.oficina_id]
    );

    if (!actual.rows.length) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    const transaccionActual = actual.rows[0];
    const tipoFinal = normalizarTipo(req.body.tipo || transaccionActual.tipo);
    const conceptoNormalizado = normalizarTexto(req.body.concepto);
    const conceptoFinal = conceptoNormalizado || transaccionActual.concepto;
    const fechaFinal = req.body.fecha || transaccionActual.fecha;
    const montoFinal = typeof req.body.monto === 'undefined'
      ? transaccionActual.monto
      : Number.parseFloat(req.body.monto);
    const formaPagoNormalizada = normalizarTexto(req.body.forma_pago);
    const formaPagoFinal = formaPagoNormalizada || transaccionActual.forma_pago;
    const clientIdFinal = Object.prototype.hasOwnProperty.call(req.body, 'client_id')
      ? normalizarClientId(req.body.client_id)
      : transaccionActual.client_id;

    if (!tipoFinal || !conceptoFinal || !fechaFinal || Number.isNaN(Number.parseFloat(montoFinal)) || Number.parseFloat(montoFinal) <= 0) {
      return res.status(400).json({ error: 'Tipo, concepto, fecha y un monto mayor a cero son obligatorios.' });
    }

    if ((tipoFinal === 'abono' || tipoFinal === 'documento') && !clientIdFinal) {
      return res.status(400).json({ error: 'Debes seleccionar un cliente para registrar abonos o documentos.' });
    }

    if (clientIdFinal) {
      const cliente = await validarClienteDeLaOficina(clientIdFinal, req.user.oficina_id);
      if (!cliente) {
        return res.status(400).json({ error: 'El cliente seleccionado no pertenece a esta oficina.' });
      }
    }

    const result = await db.query(
      `UPDATE finanzas SET
         tipo = $1,
         concepto = $2,
         fecha = $3,
         monto = $4,
         client_id = $5,
         forma_pago = $6
       WHERE id = $7 AND oficina_id = $8
       RETURNING *`,
      [
        tipoFinal,
        conceptoFinal,
        fechaFinal,
        montoFinal,
        clientIdFinal,
        formaPagoFinal,
        id,
        req.user.oficina_id,
      ]
    );
    await registrarHistorial(req, `Se actualizó transacción id ${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar transacción:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/retiros', async (req, res) => {
  const socio = normalizarTexto(req.body.socio);
  const monto = Number.parseFloat(req.body.monto);
  const fecha = req.body.fecha;

  if (!socio || Number.isNaN(monto) || monto <= 0 || !fecha) {
    return res.status(400).json({ error: 'Socio, fecha y un monto mayor a cero son obligatorios.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO retiros_socios (oficina_id, socio, monto, fecha)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.oficina_id, socio, monto, fecha]
    );
    await registrarHistorial(req, `Se registró retiro ${socio} id ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al registrar retiro:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/reparto', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin) fechaFin = new Date().toISOString().slice(0, 10);

  try {
    const ing = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_ingresos
       FROM finanzas
       WHERE oficina_id = $1
         AND tipo = 'ingreso'
         AND fecha BETWEEN $2 AND $3`,
      [req.user.oficina_id, fechaInicio, fechaFin]
    );
    const eg = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_egresos
       FROM finanzas
       WHERE oficina_id = $1
         AND tipo = 'egreso'
         AND fecha BETWEEN $2 AND $3`,
      [req.user.oficina_id, fechaInicio, fechaFin]
    );

    const totalIngresos = parseFloat(ing.rows[0].total_ingresos);
    const totalEgresos = parseFloat(eg.rows[0].total_egresos);
    const utilidadNeta = totalIngresos - totalEgresos;
    const mitad = utilidadNeta / 2;

    const retiros = await db.query(
      `SELECT socio, COALESCE(SUM(monto), 0) AS total_retirado
       FROM retiros_socios
       WHERE oficina_id = $1
         AND fecha BETWEEN $2 AND $3
       GROUP BY socio`,
      [req.user.oficina_id, fechaInicio, fechaFin]
    );

    let retiradoLiz = 0;
    let retiradoAlberto = 0;
    retiros.rows.forEach((row) => {
      if (row.socio === 'Liz') retiradoLiz = parseFloat(row.total_retirado);
      if (row.socio === 'Alberto') retiradoAlberto = parseFloat(row.total_retirado);
    });

    const parteLiz = mitad - retiradoLiz;
    const parteAlberto = mitad - retiradoAlberto;

    res.json({ utilidadNeta, parteLiz, parteAlberto, retiradoLiz, retiradoAlberto });
  } catch (err) {
    console.error('Error al obtener reparto:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/retiros', async (req, res) => {
  let { fechaInicio, fechaFin } = req.query;
  if (!fechaInicio) fechaInicio = '1970-01-01';
  if (!fechaFin) fechaFin = new Date().toISOString().slice(0, 10);

  try {
    const result = await db.query(
      `SELECT id, socio, monto, fecha
       FROM retiros_socios
       WHERE oficina_id = $1
         AND fecha BETWEEN $2 AND $3
       ORDER BY fecha DESC, id DESC`,
      [req.user.oficina_id, fechaInicio, fechaFin]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener retiros:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/retiros/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM retiros_socios WHERE id = $1 AND oficina_id = $2 RETURNING id',
      [id, req.user.oficina_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Retiro no encontrado' });
    }
    await registrarHistorial(req, `Se eliminó retiro id ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar retiro:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
