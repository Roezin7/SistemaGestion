import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Badge, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, List, ListItemButton, ListItemText, MenuItem, Paper,
  Stack, TextField, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import api from '../services/api';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointment, setAppointment] = useState({ scheduled_at: '', duration_minutes: 15, modality: 'whatsapp_call', notes: '' });

  const loadList = useCallback(async () => {
    try {
      const response = await api.get('/api/conversations', { params: filter ? { mode: filter } : {} });
      setConversations(response.data);
      if (!selectedId && response.data[0]) setSelectedId(response.data[0].id);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo cargar la bandeja.');
    } finally {
      setLoading(false);
    }
  }, [filter, selectedId]);

  const loadConversation = useCallback(async (id, markRead = false) => {
    if (!id) return;
    try {
      const [detail, messageList] = await Promise.all([
        api.get(`/api/conversations/${id}`),
        api.get(`/api/conversations/${id}/messages`),
      ]);
      setSelected(detail.data);
      setMessages(messageList.data);
      if (markRead && detail.data.unread_count > 0) {
        await api.post(`/api/conversations/${id}/read`);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo abrir la conversación.');
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadConversation(selectedId, true); }, [selectedId, loadConversation]);
  useEffect(() => {
    const timer = setInterval(() => {
      loadList();
      if (selectedId) loadConversation(selectedId);
    }, 5000);
    return () => clearInterval(timer);
  }, [loadList, loadConversation, selectedId]);

  const send = async () => {
    if (!draft.trim() || !selectedId) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${selectedId}/send`, { text: draft.trim() });
      setDraft('');
      await loadConversation(selectedId);
      await loadList();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const changeMode = async (action) => {
    try {
      await api.post(`/api/conversations/${selectedId}/${action}`);
      await Promise.all([loadConversation(selectedId), loadList()]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo cambiar el modo.');
    }
  };
  const doNotContact=async()=>{try{await api.post(`/api/conversations/${selectedId}/do-not-contact`,{reason:'Marcado desde la bandeja'});await Promise.all([loadConversation(selectedId),loadList()]);}catch(e){setError(e.response?.data?.message||'No se pudo marcar.');}};
  const schedule = async () => {
    try { await api.post('/api/appointments', { ...appointment, scheduled_at: new Date(appointment.scheduled_at).toISOString(), conversation_id: selectedId }); setAppointmentOpen(false);
      setAppointment({ scheduled_at:'',duration_minutes:15,modality:'whatsapp_call',notes:'' }); await Promise.all([loadConversation(selectedId),loadList()]); }
    catch(requestError){setError(requestError.response?.data?.message||'No se pudo agendar.');}
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box><Typography variant="h4">Bandeja de WhatsApp</Typography>
          <Typography color="text.secondary">Atención humana y mensajes registrados por oficina.</Typography></Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField select size="small" label="Modo" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Todos</MenuItem><MenuItem value="automatico">Automático</MenuItem>
            <MenuItem value="humano">Humano</MenuItem><MenuItem value="pausado">Pausado</MenuItem>
          </TextField>
          <IconButton onClick={loadList}><RefreshIcon /></IconButton>
        </Stack>
      </Stack>
      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px minmax(0,1fr)' }, gap: 2, minHeight: 620 }}>
        <Paper variant="outlined" sx={{ overflow: 'auto', maxHeight: 720 }}>
          {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box> : null}
          <List disablePadding>
            {conversations.map((item) => (
              <React.Fragment key={item.id}>
                <ListItemButton selected={item.id === selectedId} onClick={() => setSelectedId(item.id)} alignItems="flex-start">
                  <ListItemText primary={<Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography fontWeight={700} noWrap>{item.display_name || item.phone_normalized}</Typography>
                    <Badge color="primary" badgeContent={item.unread_count || 0} /></Stack>}
                    secondary={<><Typography variant="body2" noWrap>{item.last_message_preview || 'Sin vista previa'}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}><Chip size="small" label={item.attention_mode} />
                        <Chip size="small" variant="outlined" label={item.source_type} /></Stack></>} />
                </ListItemButton><Divider />
              </React.Fragment>
            ))}
          </List>
        </Paper>

        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!selected ? <Box sx={{ p: 6, textAlign: 'center' }}><Typography color="text.secondary">Selecciona una conversación.</Typography></Box> : <>
            <Box sx={{ p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
              <Box><Typography variant="h6">{selected.display_name || selected.phone_normalized}</Typography>
                <Typography variant="body2" color="text.secondary">{selected.phone_normalized} · {selected.prospecto_nombre || 'Sin prospecto vinculado'}</Typography></Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button size="small" onClick={() => changeMode('handoff')}>Tomar</Button>
                <Button size="small" onClick={() => changeMode('pause')}>Pausar</Button>
                <Button size="small" onClick={() => changeMode('resume')} disabled={selected.source_type !== 'meta_ad'}>Reactivar</Button>
                <Button size="small" variant="contained" onClick={() => setAppointmentOpen(true)}>Agendar</Button>
                <Button size="small" color="error" onClick={doNotContact} disabled={Boolean(selected.do_not_contact_at)}>No contactar</Button>
              </Stack></Stack></Box><Divider />
            {(selected.summary||selected.lead_strength||selected.appointment_at)?<Box sx={{px:2,py:1.5}}><Stack direction="row" spacing={1} flexWrap="wrap">
              {selected.lead_strength?<Chip label={`Perfil: ${selected.lead_strength}`} />:null}{selected.service_code?<Chip label={selected.service_code} variant="outlined" />:null}
              {selected.appointment_at?<Chip color="success" label={`Cita: ${formatDate(selected.appointment_at)}`} />:null}</Stack>
              {selected.summary?<Typography variant="body2" sx={{mt:1}}>{selected.summary}</Typography>:null}</Box>:null}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'rgba(0,0,0,0.025)' }}>
              <Stack spacing={1.5}>{messages.map((message) => (
                <Box key={message.id} sx={{ alignSelf: message.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                  <Paper sx={{ p: 1.5, bgcolor: message.direction === 'outbound' ? 'primary.main' : 'background.paper', color: message.direction === 'outbound' ? 'primary.contrastText' : 'text.primary' }}>
                    <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.body || `[${message.message_type}]`}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75 }}>{formatDate(message.provider_timestamp || message.created_at)} · {message.status}</Typography>
                  </Paper>
                </Box>))}</Stack>
            </Box><Divider />
            <Stack direction="row" spacing={1} sx={{ p: 2 }}>
              <TextField fullWidth multiline maxRows={4} placeholder="Escribe una respuesta…" value={draft}
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <IconButton color="primary" onClick={send} disabled={sending || !draft.trim()}><SendIcon /></IconButton>
            </Stack>
          </>}
        </Paper>
      </Box>
      <Dialog open={appointmentOpen} onClose={()=>setAppointmentOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Agendar llamada</DialogTitle><DialogContent>
        <Stack spacing={2} sx={{mt:1}}><TextField type="datetime-local" label="Fecha y hora" InputLabelProps={{shrink:true}} value={appointment.scheduled_at} onChange={(e)=>setAppointment(a=>({...a,scheduled_at:e.target.value}))} />
          <TextField select label="Modalidad" value={appointment.modality} onChange={(e)=>setAppointment(a=>({...a,modality:e.target.value}))}><MenuItem value="whatsapp_call">Llamada por WhatsApp</MenuItem><MenuItem value="phone_call">Llamada telefónica</MenuItem></TextField>
          <TextField type="number" label="Duración (minutos)" value={appointment.duration_minutes} onChange={(e)=>setAppointment(a=>({...a,duration_minutes:e.target.value}))} />
          <TextField multiline label="Notas" value={appointment.notes} onChange={(e)=>setAppointment(a=>({...a,notes:e.target.value}))} /></Stack>
      </DialogContent><DialogActions><Button onClick={()=>setAppointmentOpen(false)}>Cancelar</Button><Button variant="contained" onClick={schedule} disabled={!appointment.scheduled_at}>Agendar</Button></DialogActions></Dialog>
    </Stack>
  );
}
