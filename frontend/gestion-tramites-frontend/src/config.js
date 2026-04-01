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

  if (hostname.endsWith('onrender.com')) {
    return window.location.origin;
  }

  // Compatibilidad con el despliegue previo del frontend separado del backend.
  return 'https://sistemagestion-pk62.onrender.com';
}

export const API_URL = normalizeUrl(process.env.REACT_APP_API_URL || getDefaultApiUrl());

export function buildApiUrl(pathname) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${API_URL}${normalizedPath}`;
}
