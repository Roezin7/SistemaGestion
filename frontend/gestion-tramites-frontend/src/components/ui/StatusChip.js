import React from 'react';
import { Chip } from '@mui/material';

const STATUS_STYLES = [
  { match: ['recepci', 'document'], sx: { bgcolor: 'rgba(13,94,111,0.10)', color: '#0d5e6f' } },
  { match: ['cita', 'cas', 'consular'], sx: { bgcolor: 'rgba(197,140,69,0.12)', color: '#8b5a1e' } },
  { match: ['proceso', 'tramit'], sx: { bgcolor: 'rgba(39,92,122,0.12)', color: '#214e67' } },
  { match: ['complet', 'finaliz'], sx: { bgcolor: 'rgba(61,125,91,0.12)', color: '#2d5d45' } },
];

function resolveStyle(label) {
  const text = String(label || '').toLowerCase();
  return STATUS_STYLES.find((entry) => entry.match.some((needle) => text.includes(needle)))?.sx || {
    bgcolor: 'rgba(72, 84, 96, 0.10)',
    color: '#46505c',
  };
}

function StatusChip({ label }) {
  return (
    <Chip
      label={label || 'Sin estado'}
      size="small"
      sx={{
        borderRadius: '999px',
        fontWeight: 700,
        ...resolveStyle(label),
      }}
    />
  );
}

export default StatusChip;
