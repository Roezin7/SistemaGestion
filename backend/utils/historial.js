// backend/utils/historial.js
const db = require('../db');

async function registrarHistorial(req, descripcion, options = {}) {
  try {
    const usuarioId = options.usuarioId ?? (req.user && req.user.id ? req.user.id : null);
    const oficinaId = options.oficinaId ?? (req.user && req.user.oficina_id ? req.user.oficina_id : null);
    const executor = options.client || db;

    if (!oficinaId) {
      return;
    }

    await executor.query(
      'INSERT INTO historial_cambios (usuario_id, oficina_id, descripcion) VALUES ($1, $2, $3)',
      [usuarioId, oficinaId, descripcion]
    );
  } catch (error) {
    console.error("Error registrando historial:", error);
  }
}

module.exports = { registrarHistorial };
