export const PROSPECT_STATUS_OPTIONS = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'no_responde', label: 'No responde' },
  { value: 'descartado', label: 'Descartado' },
  { value: 'convertido', label: 'Convertido' },
];

export const PROSPECT_PRIORITY_OPTIONS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

export const PROSPECT_SOURCE_OPTIONS = [
  'Facebook',
  'Instagram',
  'WhatsApp',
  'Referido',
  'Llamada',
  'Oficina',
  'Sitio web',
  'Otro',
];

export function getProspectStatusLabel(value) {
  return PROSPECT_STATUS_OPTIONS.find((option) => option.value === value)?.label || 'Sin estado';
}

export function getProspectPriorityLabel(value) {
  return PROSPECT_PRIORITY_OPTIONS.find((option) => option.value === value)?.label || 'Media';
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 10);
}

export function isFollowUpDue(value) {
  if (!value) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return !Number.isNaN(dueDate.getTime()) && dueDate <= today;
}
