// backend/routes/clientes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken } = require('../routes/auth'); // Usamos el middleware de auth

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

// GET: Obtener todos los clientes (público)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Agregar un nuevo cliente (protegido)
router.post('/', verificarToken, async (req, res) => {
  const { nombre, integrantes, numeroRecibo, estadoTramite } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO clientes (nombre, integrantes, numero_recibo, estado_tramite, fecha_inicio_tramite, costo_total_tramite) VALUES ($1, $2, $3, $4, NOW(), NULL) RETURNING *',
      [nombre, integrantes, numeroRecibo, estadoTramite]
    );
    const nuevoCliente = result.rows[0];
    await registrarHistorial(req, `Se agregó un nuevo cliente con id ${nuevoCliente.id}`);
    res.json(nuevoCliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Actualizar datos de un cliente (protegido)
router.put('/:id', verificarToken, async (req, res) => {
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
    const clienteActualizado = result.rows[0];
    await registrarHistorial(req, `Se actualizó el cliente con id ${id}`);
    res.json(clienteActualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Eliminar un cliente (protegido)
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM clientes WHERE id = $1', [id]);
    await registrarHistorial(req, `Se eliminó el cliente con id ${id}`);
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Subir documentación para un cliente (protegido)
router.post('/:id/documentos', verificarToken, upload.array('documentos', 5), async (req, res) => {
  const { id } = req.params;
  const archivos = req.files;
  try {
    for (let archivo of archivos) {
      await db.query(
        'INSERT INTO documentos_cliente (cliente_id, ruta_archivo, nombre_archivo) VALUES ($1, $2, $3)',
        [id, archivo.path, archivo.originalname]
      );
    }
    await registrarHistorial(req, `Se subieron documentos para el cliente con id ${id}`);
    res.json({ message: 'Documentos subidos correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Renombrar un documento (protegido)
router.put('/documentos/:docId', verificarToken, async (req, res) => {
  const { docId } = req.params;
  const { nuevoNombre } = req.body;
  try {
    const result = await db.query(
      'UPDATE documentos_cliente SET nombre_archivo = $1 WHERE id = $2 RETURNING *',
      [nuevoNombre, docId]
    );
    await registrarHistorial(req, `Se renombró el documento con id ${docId} a "${nuevoNombre}"`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Eliminar un documento (protegido)
router.delete('/documentos/:docId', verificarToken, async (req, res) => {
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
    await registrarHistorial(req, `Se eliminó el documento con id ${docId}`);
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Obtener documentos para un cliente (público)
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
