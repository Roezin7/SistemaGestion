// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Asegurarse de que la carpeta "uploads" exista
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Servir archivos estáticos (para la carga de documentos)
app.use('/uploads', express.static(uploadsDir));

// Rutas existentes
const clientesRoutes = require('./routes/clientes');
const finanzasRoutes = require('./routes/finanzas');
const kpisRoutes = require('./routes/kpis');

app.use('/api/clientes', clientesRoutes);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/kpis', kpisRoutes);

// Nueva ruta de autenticación
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Endpoint para visualizar documentos subidos correctamente
app.get('/api/documentos/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Documento no encontrado');
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Sistema de Gestión de Trámites Migratorios');
});

// Servir el frontend desde "frontend/gestion-tramites-frontend/build"
app.use(express.static(path.join(__dirname, '../frontend/gestion-tramites-frontend/build')
));

// Manejar rutas desconocidas y redirigir al frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/gestion-tramites-frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
