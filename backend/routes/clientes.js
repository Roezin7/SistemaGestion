// src/routes/clientes.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { registrarHistorial } = require('../utils/historial');
const { verificarToken, allowRoles } = require('../middleware');

const UPLOADS_ROOT = path.resolve(path.join(__dirname, '../uploads'));
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx']);

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarEnteroOpcional(valor) {
  if (valor === '' || valor === null || typeof valor === 'undefined') {
    return null;
  }

  const parsed = Number.parseInt(valor, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizarFechaOpcional(valor) {
  return valor === '' || valor === null || typeof valor === 'undefined' ? null : valor;
}

function obtenerCarpetaOficina(oficinaId) {
  const carpeta = path.join(UPLOADS_ROOT, `oficina-${oficinaId}`);
  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }
  return carpeta;
}

function crearUploadValidationError(message) {
  const error = new Error(message);
  error.code = 'UPLOAD_VALIDATION_ERROR';
  return error;
}

function archivoPermitido(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  return ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype) && ALLOWED_UPLOAD_EXTENSIONS.has(extension);
}

function limpiarArchivosSubidos(files = []) {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, obtenerCarpetaOficina(req.user.oficina_id));
  },
  filename: (req, file, cb) => {
    const nombreSeguro = path.basename(file.originalname).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${nombreSeguro}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!archivoPermitido(file)) {
      return cb(crearUploadValidationError('Solo se permiten archivos PDF, imagen o documentos Word de hasta 10 MB'));
    }
    return cb(null, true);
  },
});

const clienteSelectSql = `
  SELECT
    c.*,
    COALESCE(c.costo_total_tramite, 0)
    + COALESCE(c.costo_total_documentos, 0)
    - COALESCE(c.abono_inicial, 0)
    - COALESCE((
        SELECT SUM(f.monto)
        FROM finanzas f
        WHERE f.oficina_id = c.oficina_id
          AND f.client_id = c.id
          AND f.tipo IN ('abono', 'ingreso', 'documento')
      ), 0) AS restante
  FROM clientes c
`;

async function obtenerClientePorId(clienteId, oficinaId) {
  const result = await db.query(
    `${clienteSelectSql}
     WHERE c.id = $1 AND c.oficina_id = $2`,
    [clienteId, oficinaId]
  );

  return result.rows[0] || null;
}

async function verificarClientePerteneceAOficina(req, res, next) {
  try {
    const cliente = await obtenerClientePorId(req.params.id, req.user.oficina_id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    req.cliente = cliente;
    return next();
  } catch (error) {
    console.error('Error validando cliente de la oficina:', error);
    return res.status(500).json({ error: 'Error al validar el cliente' });
  }
}

router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query(
      `${clienteSelectSql}
       WHERE c.oficina_id = $1
       ORDER BY c.id`,
      [req.user.oficina_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar clientes:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', verificarToken, async (req, res) => {
  try {
    const cliente = await obtenerClientePorId(req.params.id, req.user.oficina_id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(cliente);
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verificarToken, async (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  const integrantes = normalizarEnteroOpcional(req.body.integrantes);
  const numeroRecibo = normalizarTexto(req.body.numeroRecibo);
  const estadoTramite = normalizarTexto(req.body.estadoTramite) || 'Recepción de documentos';
  const fecha_inicio_tramite = normalizarFechaOpcional(req.body.fecha_inicio_tramite);

  if (!nombre || !numeroRecibo) {
    return res.status(400).json({ error: 'Nombre y número de recibo son obligatorios.' });
  }

  try {
    const insert = await db.query(
      `INSERT INTO clientes
         (oficina_id, nombre, integrantes, numero_recibo, estado_tramite, fecha_inicio_tramite, costo_total_tramite)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)
       RETURNING *`,
      [req.user.oficina_id, nombre, integrantes, numeroRecibo, estadoTramite, fecha_inicio_tramite]
    );

    const nuevo = await obtenerClientePorId(insert.rows[0].id, req.user.oficina_id);
    await registrarHistorial(req, `Se agregó cliente id ${insert.rows[0].id}`);
    res.json(nuevo);
  } catch (err) {
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

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
    costo_total_tramite,
    costo_total_documentos,
    abono_inicial,
  } = req.body;

  nombre = normalizarTexto(nombre) || null;
  integrantes = normalizarEnteroOpcional(integrantes);
  numeroRecibo = normalizarTexto(numeroRecibo) || null;
  estadoTramite = normalizarTexto(estadoTramite) || null;
  fecha_cita_cas = fecha_cita_cas === '' ? null : fecha_cita_cas;
  fecha_cita_consular = fecha_cita_consular === '' ? null : fecha_cita_consular;
  fecha_inicio_tramite = fecha_inicio_tramite === '' ? null : fecha_inicio_tramite;
  costo_total_tramite = costo_total_tramite === '' ? null : costo_total_tramite;
  costo_total_documentos = costo_total_documentos === '' ? null : costo_total_documentos;
  abono_inicial = abono_inicial === '' ? null : abono_inicial;

  try {
    const updateResult = await db.query(
      `UPDATE clientes SET
         nombre = COALESCE($1, nombre),
         integrantes = COALESCE($2, integrantes),
         numero_recibo = COALESCE($3, numero_recibo),
         estado_tramite = COALESCE($4, estado_tramite),
         fecha_cita_cas = COALESCE($5, fecha_cita_cas),
         fecha_cita_consular = COALESCE($6, fecha_cita_consular),
         fecha_inicio_tramite = COALESCE($7, fecha_inicio_tramite),
         costo_total_tramite = COALESCE($8, costo_total_tramite),
         costo_total_documentos = COALESCE($9, costo_total_documentos),
         abono_inicial = COALESCE($10, abono_inicial)
       WHERE id = $11 AND oficina_id = $12`,
      [
        nombre,
        integrantes,
        numeroRecibo,
        estadoTramite,
        fecha_cita_cas,
        fecha_cita_consular,
        fecha_inicio_tramite,
        costo_total_tramite,
        costo_total_documentos,
        abono_inicial,
        id,
        req.user.oficina_id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await registrarHistorial(req, `Se actualizó cliente id ${id}`);
    const clienteActualizado = await obtenerClientePorId(id, req.user.oficina_id);
    res.json(clienteActualizado);
  } catch (err) {
    console.error(`Error al actualizar cliente ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verificarToken, allowRoles('admin', 'gerente'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM clientes WHERE id = $1 AND oficina_id = $2',
      [id, req.user.oficina_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await registrarHistorial(req, `Se eliminó cliente id ${id}`);
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

router.post(
  '/:id/documentos',
  verificarToken,
  verificarClientePerteneceAOficina,
  upload.array('documentos', 5),
  async (req, res) => {
    const { id } = req.params;
    try {
      if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'Debes adjuntar al menos un archivo válido' });
      }

      for (const file of req.files) {
        await db.query(
          `INSERT INTO documentos_cliente (cliente_id, oficina_id, ruta_archivo, nombre_archivo)
           VALUES ($1, $2, $3, $4)`,
          [id, req.user.oficina_id, file.path, file.originalname]
        );
      }

      await registrarHistorial(req, `Se subieron documentos para cliente id ${id}`);
      res.json({ message: 'Documentos subidos correctamente' });
    } catch (err) {
      limpiarArchivosSubidos(req.files);
      console.error('Error al subir documentos:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/documentos/:docId/archivo', verificarToken, async (req, res) => {
  const { docId } = req.params;

  try {
    const result = await db.query(
      `SELECT id, nombre_archivo, ruta_archivo
       FROM documentos_cliente
       WHERE id = $1 AND oficina_id = $2`,
      [docId, req.user.oficina_id]
    );

    const documento = result.rows[0];
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (!fs.existsSync(documento.ruta_archivo)) {
      return res.status(404).json({ error: 'El archivo ya no existe en el servidor' });
    }

    const resolvedPath = path.resolve(documento.ruta_archivo);
    if (!resolvedPath.startsWith(UPLOADS_ROOT + path.sep) && resolvedPath !== UPLOADS_ROOT) {
      return res.status(403).json({ error: 'Ruta de archivo no permitida' });
    }

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(documento.nombre_archivo)}"`);
    return res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Error al abrir documento:', error);
    return res.status(500).json({ error: 'Error al abrir el documento' });
  }
});

router.put('/documentos/:docId', verificarToken, async (req, res) => {
  const { docId } = req.params;
  const nuevoNombre = path.basename(normalizarTexto(req.body.nuevoNombre));

  if (!nuevoNombre) {
    return res.status(400).json({ error: 'El nombre del documento es obligatorio' });
  }

  try {
    const result = await db.query(
      `UPDATE documentos_cliente
       SET nombre_archivo = $1
       WHERE id = $2 AND oficina_id = $3
       RETURNING *`,
      [nuevoNombre, docId, req.user.oficina_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    await registrarHistorial(req, `Se renombró documento id ${docId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al renombrar documento:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/documentos/:docId', verificarToken, async (req, res) => {
  const { docId } = req.params;
  try {
    const doc = await db.query(
      'SELECT * FROM documentos_cliente WHERE id = $1 AND oficina_id = $2',
      [docId, req.user.oficina_id]
    );

    if (!doc.rows.length) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (fs.existsSync(doc.rows[0].ruta_archivo)) {
      fs.unlinkSync(doc.rows[0].ruta_archivo);
    }

    await db.query(
      'DELETE FROM documentos_cliente WHERE id = $1 AND oficina_id = $2',
      [docId, req.user.oficina_id]
    );
    await registrarHistorial(req, `Se eliminó documento id ${docId}`);
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar documento:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/documentos', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const cliente = await obtenerClientePorId(id, req.user.oficina_id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const result = await db.query(
      `SELECT id, cliente_id, oficina_id, ruta_archivo, nombre_archivo, fecha_subida
       FROM documentos_cliente
       WHERE cliente_id = $1 AND oficina_id = $2
       ORDER BY fecha_subida DESC, id DESC`,
      [id, req.user.oficina_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar documentos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
