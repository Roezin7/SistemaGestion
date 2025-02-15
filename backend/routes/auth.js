// backend/routes/auth.js
const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Autenticación básica: se utilizan variables de entorno para las credenciales
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    // En una implementación real se generaría un token JWT
    return res.json({ success: true, message: 'Login exitoso' });
  } else {
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }
});

module.exports = router;
