// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Asegúrate de importar la conexión a la base de datos
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || "clave_secreta"; // Cambia esto en producción

// 🚀 **Registro de Usuarios**
router.post('/register', async (req, res) => {
    const { nombre, username, password, rol } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO usuarios (nombre, username, password, rol) VALUES ($1, $2, $3, $4) RETURNING id',
            [nombre, username, hashedPassword, rol || 'usuario']
        );
        res.status(201).json({ success: true, userId: result.rows[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
});

// 🚀 **Inicio de Sesión**
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ success: true, token, userId: user.id, username: user.username, rol: user.rol });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el inicio de sesión' });
    }
});

// 🚀 **Middleware para verificar autenticación**
const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ success: false, message: 'Acceso denegado' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token inválido' });
    }
};

// 🚀 **Obtener el historial de cambios**
router.get('/historial', verificarToken, async (req, res) => {
    try {
        const result = await db.query('SELECT h.*, u.username FROM historial_cambios h JOIN usuarios u ON h.usuario_id = u.id ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener historial de cambios' });
    }
});

module.exports = router;
