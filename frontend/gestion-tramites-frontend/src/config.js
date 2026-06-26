function normalizeUrl(url) {
  return url.replace(/\/+$/, '');
}

function getDefaultApiUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  if (window.location.port === '3000') {
    return 'http://localhost:5000';
  }

  const hostname = window.location.hostname;

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    return 'http://localhost:5000';
  }

  // El backend sirve el frontend desde el mismo origen (Render, Coolify, etc.),
  // así que la API vive en el mismo host bajo /api.
  return window.location.origin;
}

export const API_URL = normalizeUrl(process.env.REACT_APP_API_URL || getDefaultApiUrl());

export function buildApiUrl(pathname) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${API_URL}${normalizedPath}`;
}
