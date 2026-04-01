import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'flex-end' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography
            variant="body2"
            sx={{
              letterSpacing: '0.08em',
              color: 'primary.main',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h4" sx={{ mt: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 720, pr: { xs: 0, md: 2 } }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions ? (
        <Box sx={{ width: { xs: '100%', md: 'auto' }, '& .MuiButton-root': { width: { xs: '100%', md: 'auto' } } }}>
          {actions}
        </Box>
      ) : null}
    </Stack>
  );
}

export default PageHeader;
