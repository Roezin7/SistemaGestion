const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const HISTORY_ACTION_OPTIONS = [
  { value: 'todos', label: 'Todas' },
  { value: 'alta', label: 'Altas' },
  { value: 'actualizacion', label: 'Actualizaciones' },
  { value: 'eliminacion', label: 'Eliminaciones' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'otros', label: 'Otros' },
];

export const HISTORY_MODULE_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'sistema', label: 'Sistema' },
];

function normalizeDescription(description) {
  return String(description || '').toLowerCase();
}

export function formatHistoryDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || '—');
  }

  return dateFormatter.format(date);
}

export function formatHistoryShortDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || '—');
  }

  return shortDateFormatter.format(date);
}

export function getHistoryActionMeta(description) {
  const text = normalizeDescription(description);

  if (text.includes('elimin')) {
    return { key: 'eliminacion', label: 'Eliminación', tone: 'error' };
  }

  if (text.includes('actualiz') || text.includes('renombr')) {
    return { key: 'actualizacion', label: 'Actualización', tone: 'info' };
  }

  if (text.includes('subieron') || text.includes('documento')) {
    return { key: 'documentos', label: 'Documentos', tone: 'warning' };
  }

  if (text.includes('agreg') || text.includes('registr')) {
    return { key: 'alta', label: 'Alta', tone: 'success' };
  }

  return { key: 'otros', label: 'Otro', tone: 'default' };
}

export function getHistoryModuleMeta(description, username) {
  const text = normalizeDescription(description);

  if (text.includes('usuario') || text.includes('rol')) {
    return { key: 'usuarios', label: 'Usuarios' };
  }

  if (text.includes('documento')) {
    return { key: 'documentos', label: 'Documentos' };
  }

  if (text.includes('transacción') || text.includes('abono') || text.includes('retiro') || text.includes('finanza')) {
    return { key: 'finanzas', label: 'Finanzas' };
  }

  if (text.includes('cliente')) {
    return { key: 'clientes', label: 'Clientes' };
  }

  if (!username || username === 'Sistema') {
    return { key: 'sistema', label: 'Sistema' };
  }

  return { key: 'sistema', label: 'Sistema' };
}

export function matchesHistoryFilters(item, search, actionFilter, moduleFilter) {
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const action = getHistoryActionMeta(item?.descripcion);
  const moduleMeta = getHistoryModuleMeta(item?.descripcion, item?.username);

  const matchesSearch = !normalizedSearch || [
    item?.descripcion,
    item?.username,
    action.label,
    moduleMeta.label,
  ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

  const matchesAction = actionFilter === 'todos' || action.key === actionFilter;
  const matchesModule = moduleFilter === 'todos' || moduleMeta.key === moduleFilter;

  return matchesSearch && matchesAction && matchesModule;
}

export function buildHistoryMetrics(items = []) {
  const today = new Date().toISOString().slice(0, 10);
  const users = new Set();
  let todayCount = 0;
  let deleteCount = 0;

  items.forEach((item) => {
    if (item?.username) {
      users.add(item.username);
    }

    if (String(item?.fecha || '').slice(0, 10) === today) {
      todayCount += 1;
    }

    if (getHistoryActionMeta(item?.descripcion).key === 'eliminacion') {
      deleteCount += 1;
    }
  });

  return {
    total: items.length,
    todayCount,
    activeUsers: users.size,
    deleteCount,
  };
}
