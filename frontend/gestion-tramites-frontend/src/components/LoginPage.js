import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import logo from '../assets/newlogo.png';
import RegisterPopup from './RegisterPopup';
import api from '../services/api';
import { saveAuthSession } from '../utils/session';

const ACCESS_POINTS = [
  'Expedientes, pagos y documentos en una misma operación.',
  'Seguimiento financiero y operativo por periodo.',
  'Accesos por rol y trazabilidad administrativa.',
];

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [openRegister, setOpenRegister] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/auth/setup-status')
      .then(({ data }) => setSetupRequired(Boolean(data.setupRequired)))
      .catch(() => setSetupRequired(false));
  }, []);

  const handleLogin = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { username, password });
      if (response.data.success) {
        saveAuthSession(response.data);
        onLoginSuccess();
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos');
      } else {
        setError('No se pudo conectar con el servidor');
      }
      console.error('Error en login:', err.response ? err.response.data : err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 6 }}>
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4.5 },
            backgroundColor: 'background.paper',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              letterSpacing: '0.08em',
              color: 'text.secondary',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Acceso interno
          </Typography>
          <Typography variant="h3" sx={{ mt: 1 }}>
            Operación migratoria con una interfaz clara y profesional.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 560 }}>
            Centraliza cartera, finanzas y documentación con un flujo sobrio para el equipo.
          </Typography>

          <Stack spacing={1.25} sx={{ mt: 4 }}>
            {ACCESS_POINTS.map((item) => (
              <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
                <TaskAltOutlinedIcon sx={{ color: 'primary.main', mt: '2px', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: 'text.primary' }}>{item}</Typography>
              </Stack>
            ))}
          </Stack>

          <Box
            sx={{
              mt: 4,
              p: 2.5,
              borderRadius: 3,
              backgroundColor: '#f8fafc',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <ShieldOutlinedIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Acceso por rol</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              El sistema restringe acciones sensibles y conserva historial de cambios administrativos.
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <img src={logo} alt="Logo" style={{ width: 110, marginBottom: 16 }} />
            <Typography variant="h4">Iniciar sesión</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ingresa con tus credenciales institucionales.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleLogin}>
            <Stack spacing={2}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField
                label="Usuario"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <TextField
                label="Contraseña"
                variant="outlined"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                type="submit"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ mt: 1 }}
              >
                {loading ? 'Validando acceso...' : 'Entrar al sistema'}
              </Button>
              {setupRequired ? (
                <Button variant="outlined" fullWidth onClick={() => setOpenRegister(true)}>
                  Crear usuario inicial
                </Button>
              ) : null}
            </Stack>
          </Box>
        </Paper>
      </Box>

      <RegisterPopup
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        onRegisterSuccess={() => {
          alert('Registro exitoso, ahora inicia sesión');
          setSetupRequired(false);
        }}
      />
    </Container>
  );
}

export default LoginPage;
