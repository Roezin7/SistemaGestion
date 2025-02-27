// src/components/AdminBanner.js
import React from 'react';
import { Box, Button, Menu, MenuItem } from '@mui/material';

const AdminBanner = ({ onSelectOption }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (option) => {
    setAnchorEl(null);
    if (option) {
      onSelectOption(option);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
      <Button color="inherit" onClick={handleMenuOpen}>
        Administrar
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => handleMenuClose(null)}
      >
        <MenuItem onClick={() => handleMenuClose('historial')}>
          Historial de Cambios
        </MenuItem>
        <MenuItem onClick={() => handleMenuClose('usuarios')}>
          Administrar Usuarios
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AdminBanner;
