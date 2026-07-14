import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../services/api';

const emptySource = {
  code: '',
  name: '',
  campaign_name: '',
  service_code: '',
};

export default function WhatsAppSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [sources, setSources] = useState([]);
  const [failures, setFailures] = useState([]);
  const [secrets, setSecrets] = useState({ api_key: '', webhook_secret: '' });
  const [sourceForm, setSourceForm] = useState(emptySource);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResponse, sourcesResponse, failuresResponse] = await Promise.all([
        api.get('/api/whatsapp/settings'),
        api.get('/api/whatsapp/ad-sources'),
        api.get('/api/whatsapp/failures'),
      ]);
      setSettings(settingsResponse.data);
      setSources(sourcesResponse.data);
      setFailures(failuresResponse.data);
      setMessage(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo cargar la configuración.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateConnection = (field, value) => {
    setSettings((current) => ({
      ...current,
      connection: { ...current.connection, [field]: value },
      agent: field === 'enabled' && value === false
        ? { ...current.agent, agent_enabled: false }
        : current.agent,
    }));
  };

  const updateAgent = (field, value) => {
    setSettings((current) => ({
      ...current,
      agent: { ...current.agent, [field]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: settings.connection.enabled,
        phone_number: settings.connection.phone_number,
        external_session_ref: settings.connection.external_session_ref,
        agent_enabled: settings.agent.agent_enabled,
        notification_recipient: settings.agent.notification_recipient,
        additional_context: settings.agent.additional_context,
        timezone: settings.agent.timezone,
        human_intervention_cooldown_minutes: settings.agent.human_intervention_cooldown_minutes,
        followup_enabled: settings.agent.followup_enabled,
        first_followup_minutes: settings.agent.first_followup_minutes,
        second_followup_minutes: settings.agent.second_followup_minutes,
        appointments_enabled: settings.agent.appointments_enabled,
      };
      if (secrets.api_key.trim()) payload.api_key = secrets.api_key.trim();
      if (secrets.webhook_secret.trim()) payload.webhook_secret = secrets.webhook_secret.trim();
      const response = await api.put('/api/whatsapp/settings', payload);
      setSettings(response.data);
      setSecrets({ api_key: '', webhook_secret: '' });
      setMessage({ type: 'success', text: 'Configuración guardada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo guardar la configuración.' });
    } finally {
      setSaving(false);
    }
  };

  const addSource = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/api/whatsapp/ad-sources', sourceForm);
      setSources((current) => [...current, response.data]);
      setSourceForm(emptySource);
      setMessage({ type: 'success', text: 'Fuente publicitaria agregada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo agregar la fuente.' });
    }
  };

  const toggleSource = async (source) => {
    try {
      const response = await api.put(`/api/whatsapp/ad-sources/${source.id}`, { active: !source.active });
      setSources((current) => current.map((item) => (item.id === source.id ? response.data : item)));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo actualizar la fuente.' });
    }
  };

  if (loading) {
    return <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!settings) return <Alert severity="error">No hay configuración disponible.</Alert>;

  const webhookUrl = `${window.location.origin}${settings.webhook_path}`;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">WhatsApp y agente</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Configuración aislada para recepción, atención automática, agenda y seguimientos.
        </Typography>
      </Box>

      {message ? <Alert severity={message.type} onClose={() => setMessage(null)}>{message.text}</Alert> : null}
      {!settings.safety.phone_registry_ready ? (
        <Alert severity="warning">
          {`Hay ${settings.safety.active_clients_without_phone} clientes activos sin teléfono en esta oficina. `}
          El agente seguirá bloqueado hasta completar los teléfonos o marcar esos expedientes inactivos.
        </Alert>
      ) : null}
      {!settings.agent.global_automation_enabled ? (
        <Alert severity="info">
          El interruptor global de automatización está apagado. Puedes preparar la configuración sin que el agente responda.
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="h6">Conexión WasenderAPI</Typography>
              <Typography variant="body2" color="text.secondary">
                Las credenciales se cifran y nunca vuelven a mostrarse.
              </Typography>
            </Box>
            <Chip label={settings.connection.connection_status} variant="outlined" />
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Número de WhatsApp con lada" fullWidth value={settings.connection.phone_number || ''}
                onChange={(event) => updateConnection('phone_number', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Referencia de sesión (opcional)" fullWidth value={settings.connection.external_session_ref || ''}
                onChange={(event) => updateConnection('external_session_ref', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label={settings.connection.api_key_configured ? 'API key (configurada)' : 'API key'} type="password"
                fullWidth value={secrets.api_key} onChange={(event) => setSecrets((current) => ({ ...current, api_key: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label={settings.connection.webhook_secret_configured ? 'Secreto webhook (configurado)' : 'Secreto webhook'}
                type="password" fullWidth value={secrets.webhook_secret}
                onChange={(event) => setSecrets((current) => ({ ...current, webhook_secret: event.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="URL del webhook" fullWidth value={webhookUrl} InputProps={{ readOnly: true,
                endAdornment: <Tooltip title="Copiar"><IconButton onClick={() => navigator.clipboard.writeText(webhookUrl)}><ContentCopyIcon /></IconButton></Tooltip> }} />
            </Grid>
          </Grid>
          <FormControlLabel control={<Switch checked={settings.agent.appointments_enabled}
            onChange={(event) => updateAgent('appointments_enabled', event.target.checked)} />} label="Permitir que el agente agende llamadas" />
          <FormControlLabel control={<Switch checked={settings.agent.followup_enabled}
            onChange={(event) => updateAgent('followup_enabled', event.target.checked)} />} label="Habilitar dos seguimientos automáticos" />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Primer seguimiento (minutos)" value={settings.agent.first_followup_minutes}
              onChange={(event)=>updateAgent('first_followup_minutes',event.target.value)} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="number" label="Segundo seguimiento (minutos)" value={settings.agent.second_followup_minutes}
              onChange={(event)=>updateAgent('second_followup_minutes',event.target.value)} /></Grid>
          </Grid>
          <FormControlLabel control={<Switch checked={settings.connection.enabled}
            onChange={(event) => updateConnection('enabled', event.target.checked)} />}
            label="Habilitar recepción de webhooks" />
        </Stack>
      </Paper>

      <Paper sx={{p:{xs:2,md:3}}}><Typography variant="h6">Fallos operativos recientes</Typography>
        <Typography variant="body2" color="text.secondary" sx={{mb:2}}>Webhooks, salidas, IA, citas notificadas, seguimientos y campañas que agotaron sus intentos.</Typography>
        <Stack spacing={1}>{failures.length?failures.map((failure)=><Alert key={`${failure.subsystem}-${failure.job_id}`} severity="error">
          {failure.subsystem} #{failure.job_id} · {failure.error||failure.status} · {new Date(failure.updated_at).toLocaleString('es-MX')}
        </Alert>):<Alert severity="success">No hay fallos durables en esta oficina.</Alert>}</Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Typography variant="h6">Control del agente por oficina</Typography>
          <FormControlLabel control={<Switch checked={settings.agent.agent_enabled}
            disabled={!settings.connection.enabled || !settings.safety.phone_registry_ready}
            onChange={(event) => updateAgent('agent_enabled', event.target.checked)} />}
            label="Agente habilitado" />
          <TextField label="Destinatario de notificaciones" value={settings.agent.notification_recipient || ''}
            onChange={(event) => updateAgent('notification_recipient', event.target.value)} />
          <TextField label="Contexto adicional de la oficina" multiline minRows={4}
            value={settings.agent.additional_context || ''}
            onChange={(event) => updateAgent('additional_context', event.target.value)} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Zona horaria" fullWidth value={settings.agent.timezone || ''}
                onChange={(event) => updateAgent('timezone', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Pausa tras intervención humana (minutos)" type="number" fullWidth
                value={settings.agent.human_intervention_cooldown_minutes}
                onChange={(event) => updateAgent('human_intervention_cooldown_minutes', event.target.value)} />
            </Grid>
          </Grid>
          <Box><Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar configuración'}</Button></Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Fuentes publicitarias</Typography>
            <Typography variant="body2" color="text.secondary">
              El primer mensaje solo se considera anuncio cuando contiene exactamente un código registrado como CB-…
            </Typography>
          </Box>
          <Grid container spacing={2} component="form" onSubmit={addSource}>
            <Grid item xs={12} md={3}><TextField label="Código CB-…" required fullWidth value={sourceForm.code}
              onChange={(event) => setSourceForm((current) => ({ ...current, code: event.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField label="Nombre" required fullWidth value={sourceForm.name}
              onChange={(event) => setSourceForm((current) => ({ ...current, name: event.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField label="Campaña" fullWidth value={sourceForm.campaign_name}
              onChange={(event) => setSourceForm((current) => ({ ...current, campaign_name: event.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField label="Servicio" fullWidth value={sourceForm.service_code}
              onChange={(event) => setSourceForm((current) => ({ ...current, service_code: event.target.value }))} /></Grid>
            <Grid item xs={12}><Button type="submit" variant="outlined">Agregar fuente</Button></Grid>
          </Grid>
          <Stack spacing={1}>
            {sources.map((source) => (
              <Paper variant="outlined" key={source.id} sx={{ p: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
                  <Box><Typography fontWeight={700}>{source.code} · {source.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{source.campaign_name || 'Sin campaña'} · {source.service_code || 'Sin servicio'}</Typography></Box>
                  <FormControlLabel control={<Switch checked={source.active} onChange={() => toggleSource(source)} />} label={source.active ? 'Activa' : 'Inactiva'} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
