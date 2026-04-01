import React from 'react';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

function EntryPanelDrawer({ open, onClose, title, subtitle, children }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: '100vw', sm: 460, md: 520 },
          maxWidth: '100vw',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
          sx={{ px: 3, py: 2.5 }}
        >
          <Box>
            <Typography variant="h5">{title}</Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 360 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          <IconButton onClick={onClose} aria-label="Cerrar panel">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {children}
        </Box>
      </Box>
    </Drawer>
  );
}

export default EntryPanelDrawer;
