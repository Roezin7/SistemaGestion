// src/routes/clientes.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken } = require('../routes/auth');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// ── GET: Todos los clientes con cálculo dinámico de “restante” ──
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.*,
        COALESCE(c.costo_total_tramite,0)
      + COALESCE(c.costo_total_documentos,0)
      - COALESCE(c.abono_inicial,0)
      - COALESCE((
          SELECT SUM(f.monto)
          FROM finanzas f
          WHERE (f.tipo='abono' OR f.tipo='ingreso')
            AND f.client_id = c.id
        ),0) AS restante
      FROM clientes c
      ORDER BY c.id;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET: Un cliente por ID con cálculo dinámico de “restante” ──
router.get('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT
        c.*,
        COALESCE(c.costo_total_tramite,0)
      + COALESCE(c.costo_total_documentos,0)
      - COALESCE(c.abono_inicial,0)
      - COALESCE((
          SELECT SUM(f.monto)
          FROM finanzas f
          WHERE (f.tipo='abono' OR f.tipo='ingreso')
            AND f.client_id = c.id
        ),0) AS restante
      FROM clientes c
      WHERE c.id = $1;
    `, [id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST: Crear cliente y recalcular restante ──
router.post('/', verificarToken, async (req, res) => {
  const { nombre, integrantes, numeroRecibo, estadoTramite, fecha_inicio_tramite } = req.body;
  try {
    const insert = await db.query(
      `INSERT INTO clientes
         (nombre, integrantes, numero_recibo, estado_tramite, fecha_inicio_tramite, costo_total_tramite)
       VALUES ($1,$2,$3,$4,$5,NULL)
       RETURNING *`,
      [nombre, integrantes, numeroRecibo, estadoTramite, fecha_inicio_tramite]
    );
    const nuevoId = insert.rows[0].id;
    await registrarHistorial(req, `Se agregó cliente id ${nuevoId}`);

    // Recalcular restante
    await db.query(
      `UPDATE clientes SET restante =
         COALESCE(costo_total_tramite,0)
       + COALESCE(costo_total_documentos,0)
       - COALESCE(abono_inicial,0)
       - COALESCE((
           SELECT SUM(monto) FROM finanzas
           WHERE (tipo='abono' OR tipo='ingreso') AND client_id=$1
         ),0)
       WHERE id = $1`,
      [nuevoId]
    );

    const result = await db.query('SELECT * FROM clientes WHERE id = $1', [nuevoId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT: Actualizar cliente y recalcular restante ──
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  let {
    nombre, integrantes, numeroRecibo, estadoTramite,
    fecha_cita_cas, fecha_cita_consular, fecha_inicio_tramite,
    costo_total_tramite, costo_total_documentos, abono_inicial
  } = req.body;

  // Convertir cadenas vacías a null
  fecha_cita_cas         = fecha_cita_cas === ""         ? null : fecha_cita_cas;
  fecha_cita_consular    = fecha_cita_consular === ""    ? null : fecha_cita_consular;
  fecha_inicio_tramite   = fecha_inicio_tramite === ""   ? null : fecha_inicio_tramite;
  costo_total_tramite    = costo_total_tramite === ""    ? null : costo_total_tramite;
  costo_total_documentos = costo_total_documentos === "" ? null : costo_total_documentos;
  abono_inicial          = abono_inicial === ""          ? null : abono_inicial;

  try {
    await db.query(
      `UPDATE clientes SET
         nombre                 = COALESCE($1, nombre),
         integrantes            = COALESCE($2, integrantes),
         numero_recibo          = COALESCE($3, numero_recibo),
         estado_tramite         = COALESCE($4, estado_tramite),
         fecha_cita_cas         = COALESCE($5, fecha_cita_cas),
         fecha_cita_consular    = COALESCE($6, fecha_cita_consular),
         fecha_inicio_tramite   = COALESCE($7, fecha_inicio_tramite),
         costo_total_tramite    = COALESCE($8, costo_total_tramite),
         costo_total_documentos = COALESCE($9, costo_total_documentos),
         abono_inicial          = COALESCE($10, abono_inicial)
       WHERE id = $11`,
      [
        nombre, integrantes, numeroRecibo, estadoTramite,
        fecha_cita_cas, fecha_cita_consular, fecha_inicio_tramite,
        costo_total_tramite, costo_total_documentos, abono_inicial,
        id
      ]
    );
    await registrarHistorial(req, `Se actualizó cliente id ${id}`);

    // Recalcular restante
    await db.query(
      `UPDATE clientes SET restante =
         COALESCE(costo_total_tramite,0)
       + COALESCE(costo_total_documentos,0)
       - COALESCE(abono_inicial,0)
       - COALESCE((
           SELECT SUM(monto) FROM finanzas
           WHERE (tipo='abono' OR tipo='ingreso') AND client_id=$1
         ),0)
       WHERE id = $1`,
      [id]
    );

    const result = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE: Eliminar cliente ──
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM clientes WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó cliente id ${id}`);
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST: Subir documentos ──
router.post('/:id/documentos', verificarToken, upload.array('documentos', 5), async (req, res) => {
  const { id } = req.params;
  try {
    for (let file of req.files) {
      await db.query(
        'INSERT INTO documentos_cliente (cliente_id, ruta_archivo, nombre_archivo) VALUES ($1, $2, $3)',
        [id, file.path, file.originalname]
      );
    }
    await registrarHistorial(req, `Se subieron documentos para cliente id ${id}`);
    res.json({ message: 'Documentos subidos correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT: Renombrar documento ──
router.put('/documentos/:docId', verificarToken, async (req, res) => {
  const { docId } = req.params;
  const { nuevoNombre } = req.body;
  try {
    const result = await db.query(
      'UPDATE documentos_cliente SET nombre_archivo = $1 WHERE id = $2 RETURNING *',
      [nuevoNombre, docId]
    );
    await registrarHistorial(req, `Se renombró documento id ${docId}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE: Eliminar documento ──
router.delete('/documentos/:docId', verificarToken, async (req, res) => {
  const { docId } = req.params;
  try {
    const doc = await db.query('SELECT * FROM documentos_cliente WHERE id = $1', [docId]);
    if (!doc.rows.length) return res.status(404).json({ error: 'Documento no encontrado' });
    if (fs.existsSync(doc.rows[0].ruta_archivo)) fs.unlinkSync(doc.rows[0].ruta_archivo);
    await db.query('DELETE FROM documentos_cliente WHERE id = $1', [docId]);
    await registrarHistorial(req, `Se eliminó documento id ${docId}`);
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET: Listar documentos de un cliente ──
router.get('/:id/documentos', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM documentos_cliente WHERE cliente_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
