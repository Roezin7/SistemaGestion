export function buildStoredUserFromAuth(data) {
  return {
    userId: data.userId,
    username: data.username,
    rol: data.rol,
    oficinaId: data.oficinaId,
    oficina: data.oficina,
    oficinas: Array.isArray(data.oficinas) ? data.oficinas : [],
  };
}

export function saveAuthSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(buildStoredUserFromAuth(data)));
}

export function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivity');
}
