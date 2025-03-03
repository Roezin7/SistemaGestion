// backend/utils/historial.js
const db = require('../db');

async function registrarHistorial(req, descripcion) {
  try {
    // Si req.user está definido, se utiliza su id; de lo contrario, se registra como "Sistema" (usuario_id nulo)
    const usuarioId = req.user && req.user.id ? req.user.id : null;
    await db.query(
      'INSERT INTO historial_cambios (usuario_id, descripcion) VALUES ($1, $2)',
      [usuarioId, descripcion]
    );
  } catch (error) {
    console.error("Error registrando historial:", error);
  }
}

module.exports = { registrarHistorial };
