import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';
import logo from '../assets/newlogo.png';

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({ nombre: '', username: '', password: '' });
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Función para iniciar sesión
  const handleLogin = async () => {
    try {
      console.log("Enviando solicitud a:", `${API_URL}/api/auth/login`);
      const response = await axios.post(`${API_URL}/api/auth/login`, { username, password });

      if (response.data.success) {
        const { token, userId, username, rol } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ userId, username, rol }));

        setUser({ userId, username, rol });
        onLoginSuccess();
      }
    } catch (err) {
      setError('Credenciales incorrectas');
      console.error("Error en login:", err.response ? err.response.data : err);
    }
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Función para manejar el registro de usuario
  const handleRegister = async () => {
    try {
      console.log("Enviando solicitud de registro a:", `${API_URL}/api/auth/register`);
      const response = await axios.post(`${API_URL}/api/auth/register`, registerData);

      if (response.data.success) {
        alert("Usuario registrado exitosamente. Ahora puedes iniciar sesión.");
        setShowRegister(false); // Ocultar el formulario de registro después del éxito
        setRegisterData({ nombre: '', username: '', password: '' }); // Limpiar los campos
      }
    } catch (err) {
      setRegisterError('Error al registrar usuario');
      console.error("Error en registro:", err.response ? err.response.data : err);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={8} p={4} boxShadow={3} textAlign="center">
        <img src={logo} alt="Logo" style={{ width: 150, marginBottom: 20 }} />

        {user ? (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              Bienvenido, {user.username}
            </Typography>
            <Typography variant="body1" align="center">
              Rol: {user.rol}
            </Typography>
            <Box mt={2}>
              <Button variant="contained" color="secondary" fullWidth onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              Iniciar Sesión
            </Typography>

            {error && (
              <Typography variant="body1" color="error">
                {error}
              </Typography>
            )}

            <TextField
              label="Usuario"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label="Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Box mt={2}>
              <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
                Iniciar Sesión
              </Button>
            </Box>

            {/* Botón para mostrar/ocultar el formulario de registro */}
            <Box mt={2}>
              <Button 
                variant="text" 
                color="secondary" 
                onClick={() => setShowRegister((prev) => !prev)} // 🔹 Se asegura de cambiar el estado
              >
                {showRegister ? "Ocultar Registro" : "¿No tienes cuenta? Regístrate"}
              </Button>
            </Box>

            {/* Formulario de Registro (oculto por defecto) */}
            {showRegister && (
              <Box mt={3} p={3} boxShadow={2}>
                <Typography variant="h5" align="center" gutterBottom>
                  Registro de Usuario
                </Typography>

                {registerError && (
                  <Typography variant="body1" color="error">
                    {registerError}
                  </Typography>
                )}

                <TextField
                  label="Nombre"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={registerData.nombre}
                  onChange={(e) => setRegisterData({ ...registerData, nombre: e.target.value })}
                />
                <TextField
                  label="Usuario"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                />
                <TextField
                  label="Contraseña"
                  variant="outlined"
                  type="password"
                  fullWidth
                  margin="normal"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                />
                
                <Box mt={2}>
                  <Button variant="contained" color="primary" fullWidth onClick={handleRegister}>
                    Registrarse
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default LoginPage;
