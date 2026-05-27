import React from 'react';
import { Chip } from '@mui/material';
import {
  getProspectPriorityLabel,
  getProspectStatusLabel,
} from '../../utils/prospectUtils';

const STATUS_STYLES = {
  nuevo: {
    bgcolor: 'rgba(36, 93, 156, 0.08)',
    color: '#245d9c',
    borderColor: 'rgba(36, 93, 156, 0.16)',
  },
  contactado: {
    bgcolor: 'rgba(71, 84, 103, 0.08)',
    color: '#475467',
    borderColor: 'rgba(71, 84, 103, 0.14)',
  },
  interesado: {
    bgcolor: 'rgba(15, 118, 110, 0.08)',
    color: '#0f766e',
    borderColor: 'rgba(15, 118, 110, 0.16)',
  },
  seguimiento: {
    bgcolor: 'rgba(181, 71, 8, 0.08)',
    color: '#b54708',
    borderColor: 'rgba(181, 71, 8, 0.16)',
  },
  no_responde: {
    bgcolor: 'rgba(99, 102, 241, 0.08)',
    color: '#4f46e5',
    borderColor: 'rgba(99, 102, 241, 0.16)',
  },
  descartado: {
    bgcolor: 'rgba(180, 35, 24, 0.08)',
    color: '#b42318',
    borderColor: 'rgba(180, 35, 24, 0.16)',
  },
  convertido: {
    bgcolor: 'rgba(15, 118, 110, 0.12)',
    color: '#0f766e',
    borderColor: 'rgba(15, 118, 110, 0.22)',
  },
};

const PRIORITY_STYLES = {
  alta: {
    bgcolor: 'rgba(180, 35, 24, 0.08)',
    color: '#b42318',
    borderColor: 'rgba(180, 35, 24, 0.16)',
  },
  media: {
    bgcolor: 'rgba(181, 71, 8, 0.08)',
    color: '#b54708',
    borderColor: 'rgba(181, 71, 8, 0.16)',
  },
  baja: {
    bgcolor: 'rgba(71, 84, 103, 0.08)',
    color: '#475467',
    borderColor: 'rgba(71, 84, 103, 0.14)',
  },
};

function ProspectChip({ type = 'status', value }) {
  const isPriority = type === 'priority';
  const styles = isPriority
    ? PRIORITY_STYLES[value] || PRIORITY_STYLES.media
    : STATUS_STYLES[value] || STATUS_STYLES.nuevo;
  const label = isPriority ? getProspectPriorityLabel(value) : getProspectStatusLabel(value);

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontWeight: 700,
        borderWidth: 1,
        borderStyle: 'solid',
        ...styles,
      }}
    />
  );
}

export default ProspectChip;
