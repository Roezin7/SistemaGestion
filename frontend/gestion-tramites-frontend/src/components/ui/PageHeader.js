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
      <Box>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{
              letterSpacing: '0.18em',
              color: 'primary.main',
              fontWeight: 800,
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h3" sx={{ mt: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions ? <Box sx={{ width: { xs: '100%', md: 'auto' } }}>{actions}</Box> : null}
    </Stack>
  );
}

export default PageHeader;
