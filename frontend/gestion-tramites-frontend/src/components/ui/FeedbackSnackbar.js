import React from 'react';
import { Alert, Snackbar } from '@mui/material';

function FeedbackSnackbar({ open, onClose, severity = 'success', message }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

export default FeedbackSnackbar;
