export const ESTADOS_TRAMITE = [
  'Recepción de documentos',
  'Revisión inicial',
  'Programación de cita',
  'Proceso consular',
  'Seguimiento',
  'Concluido',
];

export const STATUS_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'concluido', label: 'Concluidos' },
  { value: 'detenido', label: 'Detenidos' },
  { value: 'sin_estado', label: 'Sin estado' },
];

const CATEGORY_CONFIG = {
  en_proceso: { label: 'En proceso' },
  concluido: { label: 'Concluido' },
  detenido: { label: 'Detenido' },
  sin_estado: { label: 'Sin estado' },
};

export function normalizeStatusLabel(label) {
  const text = String(label || '').trim();
  return text || CATEGORY_CONFIG.sin_estado.label;
}

export function getStatusCategory(label) {
  const text = String(label || '').trim().toLowerCase();

  if (!text) {
    return 'sin_estado';
  }

  if (
    text.includes('conclu') ||
    text.includes('finaliz') ||
    text.includes('complet') ||
    text.includes('entreg')
  ) {
    return 'concluido';
  }

  if (
    text.includes('espera') ||
    text.includes('pausa') ||
    text.includes('deten') ||
    text.includes('cancel') ||
    text.includes('rechaz') ||
    text.includes('observ')
  ) {
    return 'detenido';
  }

  return 'en_proceso';
}

export function getStatusCategoryLabel(category) {
  return CATEGORY_CONFIG[category]?.label || CATEGORY_CONFIG.sin_estado.label;
}

export function matchesStatusFilter(label, filterValue) {
  if (!filterValue || filterValue === 'todos') {
    return true;
  }

  return getStatusCategory(label) === filterValue;
}

export function buildStatusCounts(items = []) {
  return items.reduce(
    (accumulator, item) => {
      const category = getStatusCategory(item?.estado_tramite);
      accumulator.total += 1;
      accumulator[category] += 1;
      return accumulator;
    },
    {
      total: 0,
      en_proceso: 0,
      concluido: 0,
      detenido: 0,
      sin_estado: 0,
    }
  );
}
