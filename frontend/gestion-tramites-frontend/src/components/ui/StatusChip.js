import React from 'react';
import { Chip } from '@mui/material';
import { getStatusCategory, normalizeStatusLabel } from '../../utils/statusUtils';

const CATEGORY_STYLES = {
  en_proceso: {
    bgcolor: 'rgba(17, 24, 39, 0.04)',
    color: '#111827',
    borderColor: 'rgba(17, 24, 39, 0.10)',
  },
  concluido: {
    bgcolor: 'rgba(15, 118, 110, 0.08)',
    color: '#0f766e',
    borderColor: 'rgba(15, 118, 110, 0.16)',
  },
  detenido: {
    bgcolor: 'rgba(181, 71, 8, 0.08)',
    color: '#b54708',
    borderColor: 'rgba(181, 71, 8, 0.16)',
  },
  sin_estado: {
    bgcolor: 'rgba(71, 84, 103, 0.08)',
    color: '#475467',
    borderColor: 'rgba(71, 84, 103, 0.14)',
  },
};

function StatusChip({ label }) {
  const category = getStatusCategory(label);
  const chipStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.sin_estado;

  return (
    <Chip
      label={normalizeStatusLabel(label)}
      size="small"
      sx={{
        fontWeight: 700,
        borderWidth: 1,
        borderStyle: 'solid',
        ...chipStyle,
      }}
    />
  );
}

export default StatusChip;
