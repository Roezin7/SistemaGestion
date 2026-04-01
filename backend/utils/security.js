const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const FALLBACK_SECRET = 'clave_secreta';
const TOKEN_ISSUER = 'sistema-migratorio';
const TOKEN_AUDIENCE = 'sistema-migratorio-web';
const PASSWORD_MIN_LENGTH = 10;

let warnedAboutFallbackSecret = false;

function getSecretKey() {
  const configuredSecret = process.env.SECRET_KEY;

  if (configuredSecret && configuredSecret.trim().length >= 32) {
    return configuredSecret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECRET_KEY debe estar configurada y tener al menos 32 caracteres en producción');
  }

  if (!warnedAboutFallbackSecret) {
    warnedAboutFallbackSecret = true;
    console.warn('Advertencia: SECRET_KEY no está configurada con suficiente longitud. Usando fallback solo para desarrollo.');
  }

  return FALLBACK_SECRET;
}

function signAuthToken(payload) {
  return jwt.sign(payload, getSecretKey(), {
    expiresIn: '8h',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getSecretKey(), {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown-ip'
  );
}

function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 20,
  keyPrefix = 'global',
  message = 'Demasiados intentos. Intenta de nuevo más tarde.',
} = {}) {
  const store = new Map();

  function purgeExpired(now) {
    for (const [key, value] of store.entries()) {
      if (value.expiresAt <= now) {
        store.delete(key);
      }
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    purgeExpired(now);

    const key = `${keyPrefix}:${getClientIp(req)}`;
    const current = store.get(key);

    if (!current || current.expiresAt <= now) {
      store.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ success: false, message });
    }

    current.count += 1;
    store.set(key, current);
    return next();
  };
}

function aplicarHeadersSeguridad(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return next();
}

function validarPasswordSegura(password) {
  const value = typeof password === 'string' ? password : '';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }

  const reglas = [
    /[a-z]/,
    /[A-Z]/,
    /[0-9]/,
  ];

  const cumple = reglas.every((rule) => rule.test(value));
  if (!cumple) {
    return 'La contraseña debe incluir mayúsculas, minúsculas y números';
  }

  return null;
}

function safeCompareStrings(a, b) {
  const valueA = Buffer.from(String(a || ''));
  const valueB = Buffer.from(String(b || ''));
  if (valueA.length !== valueB.length) {
    return false;
  }
  return crypto.timingSafeEqual(valueA, valueB);
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  getSecretKey,
  signAuthToken,
  verifyAuthToken,
  getClientIp,
  createRateLimiter,
  aplicarHeadersSeguridad,
  validarPasswordSegura,
  safeCompareStrings,
};
