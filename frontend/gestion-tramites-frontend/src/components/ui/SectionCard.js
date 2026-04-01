import React from 'react';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';

function SectionCard({ title, subtitle, actions, children, contentSx, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        border: '1px solid rgba(10, 58, 69, 0.08)',
        backgroundColor: 'background.paper',
        backdropFilter: 'blur(16px)',
      }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={1.5}
          >
            <Box>
              {title && <Typography variant="h5">{title}</Typography>}
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {actions ? <Box>{actions}</Box> : null}
          </Stack>
          <Divider sx={{ my: 2 }} />
        </>
      )}
      <Box sx={contentSx}>{children}</Box>
    </Paper>
  );
}

export default SectionCard;
