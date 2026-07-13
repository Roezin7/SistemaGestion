import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import api from '../services/api';

export default function AgendaPage(){
  const [appointments,setAppointments]=useState([]),[settings,setSettings]=useState(null),[advisors,setAdvisors]=useState([]),[loading,setLoading]=useState(true),[notice,setNotice]=useState(null);
  const load=useCallback(async()=>{try{const [a,s,u]=await Promise.all([api.get('/api/appointments'),api.get('/api/appointments/settings'),api.get('/api/appointments/advisors')]);setAppointments(a.data);setSettings(s.data);setAdvisors(u.data);}catch(e){setNotice({severity:'error',text:e.response?.data?.message||'No se pudo cargar la agenda.'});}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const patch=(field,value)=>setSettings((s)=>({...s,[field]:value}));
  const save=async()=>{try{const r=await api.put('/api/appointments/settings',settings);setSettings(r.data);setNotice({severity:'success',text:'Configuración guardada.'});}catch(e){setNotice({severity:'error',text:e.response?.data?.message||'No se pudo guardar.'});}};
  if(loading)return <Box sx={{p:8,textAlign:'center'}}><CircularProgress/></Box>;
  return <Stack spacing={3}>
    <Box><Typography variant="h4">Agenda de llamadas</Typography><Typography color="text.secondary">Citas de la oficina activa y reglas de disponibilidad.</Typography></Box>
    {notice?<Alert severity={notice.severity} onClose={()=>setNotice(null)}>{notice.text}</Alert>:null}
    <Paper sx={{p:3}}><Typography variant="h6" sx={{mb:2}}>Disponibilidad</Typography><Grid container spacing={2}>
      <Grid item xs={6} md={2}><TextField fullWidth type="time" label="Inicio" InputLabelProps={{shrink:true}} value={settings?.weekday_start?.slice(0,5)||''} onChange={(e)=>patch('weekday_start',e.target.value)}/></Grid>
      <Grid item xs={6} md={2}><TextField fullWidth type="time" label="Fin" InputLabelProps={{shrink:true}} value={settings?.weekday_end?.slice(0,5)||''} onChange={(e)=>patch('weekday_end',e.target.value)}/></Grid>
      <Grid item xs={6} md={2}><TextField fullWidth type="number" label="Bloque (min)" value={settings?.slot_minutes||15} onChange={(e)=>patch('slot_minutes',e.target.value)}/></Grid>
      <Grid item xs={6} md={2}><TextField fullWidth type="number" label="Duración" value={settings?.default_duration_minutes||15} onChange={(e)=>patch('default_duration_minutes',e.target.value)}/></Grid>
      <Grid item xs={12} md={4}><TextField fullWidth label="Zona horaria" value={settings?.timezone||''} onChange={(e)=>patch('timezone',e.target.value)}/></Grid>
      <Grid item xs={12} md={4}><TextField select fullWidth label="Asesor principal" value={settings?.primary_advisor_id||''} onChange={(e)=>patch('primary_advisor_id',e.target.value||null)}><MenuItem value="">Sin asignar</MenuItem>{advisors.map((u)=><MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}</TextField></Grid>
      <Grid item xs={12}><FormControlLabel control={<Switch checked={Boolean(settings?.allow_same_day)} onChange={(e)=>patch('allow_same_day',e.target.checked)}/>} label="Permitir citas el mismo día"/></Grid>
    </Grid><Button variant="contained" onClick={save}>Guardar configuración</Button></Paper>
    <Paper sx={{p:3}}><Typography variant="h6" sx={{mb:2}}>Próximas citas</Typography><Stack spacing={1.5}>{appointments.length?appointments.map((a)=><Box key={a.id} sx={{p:2,border:'1px solid',borderColor:'divider',borderRadius:2}}><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" spacing={1}><Box><Typography fontWeight={700}>{a.display_name||a.prospecto_nombre||a.phone_normalized}</Typography><Typography variant="body2">{new Date(a.scheduled_at).toLocaleString('es-MX')} · {a.modality==='whatsapp_call'?'WhatsApp':'Teléfono'} · {a.duration_minutes} min</Typography></Box><Stack direction="row" spacing={1}><Chip size="small" label={a.status}/>{a.extraordinary?<Chip size="small" color="warning" label="Extraordinaria"/>:null}</Stack></Stack></Box>):<Typography color="text.secondary">No hay citas en el periodo.</Typography>}</Stack></Paper>
  </Stack>;
}
