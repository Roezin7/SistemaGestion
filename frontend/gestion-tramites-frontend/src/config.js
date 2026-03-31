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

  return window.location.origin;
}

export const API_URL = normalizeUrl(process.env.REACT_APP_API_URL || getDefaultApiUrl());

export function buildApiUrl(pathname) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${API_URL}${normalizedPath}`;
}
