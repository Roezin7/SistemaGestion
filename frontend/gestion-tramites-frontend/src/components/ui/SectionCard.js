import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

function SectionCard({ title, subtitle, actions, children, contentSx, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        backgroundColor: 'background.paper',
      }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', lg: 'center' }}
          spacing={1.5}
          sx={{ mb: 2.5 }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && <Typography variant="h6">{title}</Typography>}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions ? (
            <Box sx={{ width: { xs: '100%', lg: 'auto' }, '& .MuiButton-root': { width: { xs: '100%', md: 'auto' } } }}>
              {actions}
            </Box>
          ) : null}
        </Stack>
      )}
      <Box sx={contentSx}>{children}</Box>
    </Paper>
  );
}

export default SectionCard;
