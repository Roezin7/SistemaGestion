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

const ACCESS_POINTS = [
  'Control de expedientes, pagos y documentación en un solo lugar.',
  'Métricas operativas y financieras con seguimiento por periodo.',
  'Administración de usuarios con permisos por rol.',
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
        const { token, userId, username: storedUsername, rol } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ userId, username: storedUsername, rol }));
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
            p: { xs: 3, md: 5 },
            border: '1px solid rgba(9, 59, 69, 0.08)',
            background:
              'linear-gradient(145deg, rgba(255,253,248,0.96), rgba(245,239,228,0.98))',
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: '0.18em', color: 'primary.main', fontWeight: 800 }}>
            SISTEMA OPERATIVO
          </Typography>
          <Typography variant="h3" sx={{ mt: 1 }}>
            Gestión migratoria con control ejecutivo y trazabilidad diaria.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
            Mantén expedientes, finanzas, documentos y operación administrativa bajo una misma interfaz,
            con seguimiento claro y consistencia para el equipo.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 4 }}>
            {ACCESS_POINTS.map((item) => (
              <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
                <TaskAltOutlinedIcon sx={{ color: 'secondary.main', mt: '2px' }} />
                <Typography variant="body1">{item}</Typography>
              </Stack>
            ))}
          </Stack>

          <Box
            sx={{
              mt: 5,
              p: 3,
              borderRadius: 4,
              backgroundColor: 'rgba(13, 94, 111, 0.08)',
              border: '1px solid rgba(13, 94, 111, 0.08)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <ShieldOutlinedIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Acceso seguro para el equipo</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Usa tus credenciales institucionales para entrar al panel. El acceso está protegido por rol y
              registra cambios relevantes del sistema.
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            border: '1px solid rgba(9, 59, 69, 0.08)',
            backgroundColor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <img src={logo} alt="Logo" style={{ width: 124, marginBottom: 18 }} />
            <Typography variant="h4">Iniciar sesión</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ingresa para acceder al panel operativo del sistema.
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
