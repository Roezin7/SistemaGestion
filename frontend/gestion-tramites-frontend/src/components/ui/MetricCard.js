import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

function MetricCard({ label, value, helper, icon, tone = 'primary' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: 152,
        border: '1px solid rgba(10, 58, 69, 0.08)',
        background:
          tone === 'accent'
            ? 'linear-gradient(145deg, rgba(197,140,69,0.16), rgba(255,255,255,0.96))'
            : tone === 'success'
              ? 'linear-gradient(145deg, rgba(61,125,91,0.16), rgba(255,255,255,0.96))'
              : 'linear-gradient(145deg, rgba(13,94,111,0.12), rgba(255,255,255,0.96))',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.14em' }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            {value}
          </Typography>
          {helper && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              {helper}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '18px',
              display: 'grid',
              placeItems: 'center',
              color: tone === 'accent' ? '#8b5a1e' : tone === 'success' ? '#2d5d45' : 'primary.main',
              backgroundColor:
                tone === 'accent'
                  ? 'rgba(197,140,69,0.16)'
                  : tone === 'success'
                    ? 'rgba(61,125,91,0.14)'
                    : 'rgba(13,94,111,0.10)',
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
