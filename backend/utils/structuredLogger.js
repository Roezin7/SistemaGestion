const REDACTED_KEYS = /api.?key|authorization|password|secret|token|sessionid/i;

function sanitize(value, depth = 0) {
  if (depth > 6 || value === null || typeof value === 'undefined') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        REDACTED_KEYS.test(key) ? '[REDACTED]' : sanitize(item, depth + 1),
      ])
    );
  }

  if (typeof value === 'string' && value.length > 2000) {
    return `${value.slice(0, 2000)}...[truncated]`;
  }

  return value;
}

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        REDACTED_KEYS.test(key) ? '[REDACTED]' : redactSecrets(item),
      ])
    );
  }
  return value;
}

function log(level, event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(data),
  };
  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

module.exports = {
  sanitize,
  redactSecrets,
  log,
  info: (event, data) => log('info', event, data),
  warn: (event, data) => log('warn', event, data),
  error: (event, data) => log('error', event, data),
};
