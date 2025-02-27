// utils/historial.js
const db = require('../db');

async function registrarHistorial(req, descripcion) {
  try {
    // Se asume que el middleware de autenticación ha puesto en req.user el usuario actual.
    await db.query(
      'INSERT INTO historial_cambios (usuario_id, descripcion) VALUES ($1, $2)',
      [req.user ? req.user.id : null, descripcion]
    );
  } catch (error) {
    console.error("Error registrando historial:", error);
  }
}

module.exports = { registrarHistorial };
