// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// 🔹 Configurar CORS para permitir solicitudes solo desde Vercel
const corsOptions = {
  origin: ["https://sistema-gestion-taupe.vercel.app"], // Asegúrate de cambiar esto por la URL final de tu frontend
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Asegurarse de que la carpeta "uploads" exista
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 🔹 Servir archivos estáticos (para la carga de documentos)
app.use('/uploads', express.static(uploadsDir));

// 🔹 Rutas existentes
const clientesRoutes = require('./routes/clientes');
const finanzasRoutes = require('./routes/finanzas');
const kpisRoutes = require('./routes/kpis');
const authRoutes = require('./routes/auth');

app.use('/api/clientes', clientesRoutes);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/kpis', kpisRoutes);
app.use('/api/auth', authRoutes);

// 🔹 Endpoint para visualizar documentos subidos correctamente
app.get('/api/documentos/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Documento no encontrado');
  }
});

// 🔹 Ruta de prueba para verificar que el backend funciona
app.get('/api/status', (req, res) => {
  res.json({ status: "ok" });
});

// 🚀 Servir el frontend correctamente 🚀
const frontendPath = path.join(__dirname, '../frontend/gestion-tramites-frontend/build');
app.use(express.static(frontendPath));

// ✅ Nueva ruta catch-all: SOLO redirige al frontend si no es una solicitud API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next(); // No redirigir si la ruta comienza con /api/
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 🔹 Iniciar el servidor en el puerto definido
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
