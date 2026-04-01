import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

function MetricCard({ label, value, helper, icon, tone = 'primary' }) {
  const toneStyles = {
    primary: {
      color: 'primary.main',
      backgroundColor: 'rgba(17, 24, 39, 0.04)',
    },
    accent: {
      color: 'warning.main',
      backgroundColor: 'rgba(181, 71, 8, 0.08)',
    },
    success: {
      color: 'success.main',
      backgroundColor: 'rgba(15, 118, 110, 0.08)',
    },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: 136,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {label}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1.25 }}>
            {value}
          </Typography>
          {helper && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {helper}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid',
              borderColor: 'divider',
              color: toneStyles[tone]?.color || toneStyles.primary.color,
              backgroundColor: toneStyles[tone]?.backgroundColor || toneStyles.primary.backgroundColor,
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export default MetricCard;
