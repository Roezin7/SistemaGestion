// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  aplicarHeadersSeguridad,
  getSecretKey,
} = require('./utils/security');

const app = express();
app.disable('x-powered-by');
getSecretKey();

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, '');
}

const configuredOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin)
  .filter(Boolean);

const configuredOriginPatterns = (process.env.FRONTEND_ORIGIN_PATTERNS || '')
  .split(',')
  .map((pattern) => pattern.trim().toLowerCase())
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://sistema-gestion-taupe.vercel.app',
  ...configuredOrigins,
]);

function isConfiguredPatternMatch(hostname, origin) {
  return configuredOriginPatterns.some((pattern) => {
    if (pattern.includes('://')) {
      return normalizeOrigin(pattern) === origin;
    }

    return hostname === pattern || hostname.endsWith(`.${pattern}`);
  });
}

function normalizeRequestHost(requestHost) {
  if (!requestHost) {
    return null;
  }

  try {
    return new URL(`http://${requestHost}`).host.toLowerCase();
  } catch {
    return String(requestHost).toLowerCase();
  }
}

function resolveRequestOrigin(req) {
  const host = normalizeRequestHost(req.headers.host);
  if (!host) {
    return '';
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' && forwardedProto.trim()
    ? forwardedProto.split(',')[0].trim()
    : req.protocol || 'http';

  return `${protocol}://${host}`;
}

function isOriginAllowed(origin, requestOrigin) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin || '');
  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  if (normalizedRequestOrigin && normalizedOrigin === normalizedRequestOrigin) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(normalizedOrigin);
    if (!['http:', 'https:'].includes(protocol)) {
      return false;
    }

    if (isConfiguredPatternMatch(hostname.toLowerCase(), normalizedOrigin)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function corsMiddleware(req, res, next) {
  const requestOrigin = resolveRequestOrigin(req);
  const corsOptions = {
    origin(origin, callback) {
      if (isOriginAllowed(origin, requestOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin || 'sin-origin'}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions)(req, res, next);
}

app.use(aplicarHeadersSeguridad);
app.use(corsMiddleware);
app.options('*', corsMiddleware);
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 🔹 Asegurarse de que la carpeta "uploads" exista
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 🔹 Rutas existentes
const clientesRoutes = require('./routes/clientes');
const finanzasRoutes = require('./routes/finanzas');
const kpisRoutes = require('./routes/kpis');
const authRoutes = require('./routes/auth');

app.use('/api/clientes', clientesRoutes);
app.use('/api/finanzas', finanzasRoutes);
app.use('/api/kpis', kpisRoutes);
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'La solicitud excede el tamaño permitido',
    });
  }

  if (err && err.message && err.message.startsWith('Origen no permitido por CORS')) {
    console.error(`${err.message} | Host: ${req.headers.host || 'sin-host'}`);
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS',
      origin: req.headers.origin || null,
    });
  }

  if (err && err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'El archivo no cumple con la política de carga',
    });
  }

  if (err && err.code === 'UPLOAD_VALIDATION_ERROR') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return next(err);
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
  console.log(`CORS origins configurados: ${configuredOrigins.join(', ') || 'ninguno (modo compatible activo)'}`);
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
