// backend/routes/clientes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para la carga de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// GET: Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Agregar un nuevo cliente
router.post('/', async (req, res) => {
  const { nombre, integrantes, numeroRecibo, estadoTramite } = req.body;
  try {
    // Se establece la fecha de inicio de trámite con NOW() y el costo_total_tramite como NULL
    const result = await db.query(
      'INSERT INTO clientes (nombre, integrantes, numero_recibo, estado_tramite, fecha_inicio_tramite, costo_total_tramite) VALUES ($1, $2, $3, $4, NOW(), NULL) RETURNING *',
      [nombre, integrantes, numeroRecibo, estadoTramite]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Actualizar datos de un cliente (convertir cadenas vacías a null en campos de fecha)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let {
    nombre,
    integrantes,
    numeroRecibo,
    estadoTramite,
    fecha_cita_cas,
    fecha_cita_consular,
    fecha_inicio_tramite,
    costo_total_tramite
  } = req.body;

  // Convertir cadenas vacías a null para los campos de fecha
  fecha_cita_cas = fecha_cita_cas === "" ? null : fecha_cita_cas;
  fecha_cita_consular = fecha_cita_consular === "" ? null : fecha_cita_consular;
  fecha_inicio_tramite = fecha_inicio_tramite === "" ? null : fecha_inicio_tramite;

  try {
    const result = await db.query(
      `UPDATE clientes SET 
          nombre = COALESCE($1, nombre), 
          integrantes = COALESCE($2, integrantes), 
          numero_recibo = COALESCE($3, numero_recibo), 
          estado_tramite = COALESCE($4, estado_tramite), 
          fecha_cita_cas = COALESCE($5, fecha_cita_cas), 
          fecha_cita_consular = COALESCE($6, fecha_cita_consular),
          fecha_inicio_tramite = COALESCE($7, fecha_inicio_tramite),
          costo_total_tramite = COALESCE($8, costo_total_tramite)
       WHERE id = $9 RETURNING *`,
      [
        nombre,
        integrantes,
        numeroRecibo,
        estadoTramite,
        fecha_cita_cas,
        fecha_cita_consular,
        fecha_inicio_tramite,
        costo_total_tramite,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Eliminar un cliente
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM clientes WHERE id = $1', [id]);
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Subir documentación para un cliente (múltiples archivos)
router.post('/:id/documentos', upload.array('documentos', 5), async (req, res) => {
  const { id } = req.params;
  const archivos = req.files;
  try {
    for (let archivo of archivos) {
      await db.query(
        'INSERT INTO documentos_cliente (cliente_id, ruta_archivo, nombre_archivo) VALUES ($1, $2, $3)',
        [id, archivo.path, archivo.originalname]
      );
    }
    res.json({ message: 'Documentos subidos correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Renombrar un documento
router.put('/documentos/:docId', async (req, res) => {
  const { docId } = req.params;
  const { nuevoNombre } = req.body;
  try {
    const result = await db.query(
      'UPDATE documentos_cliente SET nombre_archivo = $1 WHERE id = $2 RETURNING *',
      [nuevoNombre, docId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Eliminar un documento
router.delete('/documentos/:docId', async (req, res) => {
  const { docId } = req.params;
  try {
    const docResult = await db.query('SELECT * FROM documentos_cliente WHERE id = $1', [docId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    const documento = docResult.rows[0];
    if (fs.existsSync(documento.ruta_archivo)) {
      fs.unlinkSync(documento.ruta_archivo);
    }
    await db.query('DELETE FROM documentos_cliente WHERE id = $1', [docId]);
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Obtener documentos para un cliente
router.get('/:id/documentos', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM documentos_cliente WHERE cliente_id = $1', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
