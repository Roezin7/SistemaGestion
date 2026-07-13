import React, { useCallback, useEffect, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress,
  FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../services/api';

export default function KnowledgeAdminPage() {
  const [catalog, setCatalog] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [contexts, setContexts] = useState({ global: null, office: null });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [newPromotion, setNewPromotion] = useState({ name: '', type: 'percentage', percentage: 50, applies_to: 'fee', active: true });

  const load = useCallback(async () => {
    try {
      const [c, p, x] = await Promise.all([api.get('/api/knowledge/catalog'), api.get('/api/knowledge/promotions'), api.get('/api/knowledge/context')]);
      setCatalog(c.data); setPromotions(p.data); setContexts(x.data); setNotice(null);
    } catch (e) { setNotice({ severity: 'error', text: e.response?.data?.message || 'No se pudo cargar el conocimiento.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patchService = (id, field, value) => setCatalog((rows) => rows.map((s) => s.id === id ? { ...s, [field]: value } : s));
  const saveService = async (service) => {
    try { await api.put(`/api/knowledge/services/${service.id}`, service); setNotice({ severity: 'success', text: 'Servicio actualizado.' }); }
    catch (e) { setNotice({ severity: 'error', text: e.response?.data?.message || 'No se pudo actualizar.' }); }
  };
  const patchPrice = (serviceId, priceId, field, value) => setCatalog((rows) => rows.map((s) => s.id !== serviceId ? s : { ...s, prices: s.prices.map((p) => p.id === priceId ? { ...p, [field]: value } : p) }));
  const savePrice = async (price) => {
    try { await api.put(`/api/knowledge/prices/${price.id}`, price); setNotice({ severity: 'success', text: 'Precio actualizado.' }); }
    catch (e) { setNotice({ severity: 'error', text: e.response?.data?.message || 'No se pudo actualizar el precio.' }); }
  };
  const patchRequirement = (serviceId, requirementId, value) => setCatalog((rows) => rows.map((s) => s.id !== serviceId ? s : { ...s, requirements: s.requirements.map((r) => r.id === requirementId ? { ...r, requirement: value } : r) }));
  const saveRequirement = async (requirement) => { try { await api.put(`/api/knowledge/requirements/${requirement.id}`, requirement); setNotice({ severity:'success',text:'Requisito actualizado.' }); } catch(e){ setNotice({severity:'error',text:e.response?.data?.message||'No se pudo guardar el requisito.'}); } };
  const addRequirement = async (service) => { try { const r=await api.post('/api/knowledge/requirements',{service_id:service.id,requirement:'Nuevo requisito',required:true,active:true}); setCatalog((rows)=>rows.map((s)=>s.id===service.id?{...s,requirements:[...s.requirements,r.data]}:s)); } catch(e){ setNotice({severity:'error',text:e.response?.data?.message||'No se pudo agregar.'}); } };
  const saveContext = async (scope) => {
    try { const response = await api.put(`/api/knowledge/context${scope === 'global' ? '/global' : ''}`, { content: contexts[scope]?.content || '' });
      setContexts((x) => ({ ...x, [scope]: response.data })); setNotice({ severity: 'success', text: 'Contexto actualizado.' }); }
    catch (e) { setNotice({ severity: 'error', text: e.response?.data?.message || 'No se pudo guardar el contexto.' }); }
  };
  const togglePromotion = async (promotion) => {
    try { await api.put(`/api/knowledge/promotions/${promotion.id}`, { ...promotion, active: !promotion.active }); await load(); }
    catch (e) { setNotice({ severity: 'error', text: e.response?.data?.message || 'No se pudo actualizar la promoción.' }); }
  };
  const patchPromotion=(id,field,value)=>setPromotions((rows)=>rows.map((p)=>p.id===id?{...p,[field]:value}:p));
  const savePromotion=async(promotion)=>{try{await api.put(`/api/knowledge/promotions/${promotion.id}`,promotion);setNotice({severity:'success',text:'Promoción actualizada.'});}catch(e){setNotice({severity:'error',text:e.response?.data?.message||'No se pudo actualizar la promoción.'});}};
  const createPromotion = async (event) => {
    event.preventDefault();
    try { await api.post('/api/knowledge/promotions', newPromotion); setNewPromotion({ name: '', type: 'percentage', percentage: 50, applies_to: 'fee', active: true }); await load(); }
    catch (e) { setNotice({ severity: 'error', text: e.response?.data?.message || 'No se pudo crear la promoción.' }); }
  };

  if (loading) return <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  return <Stack spacing={3}>
    <Box><Typography variant="h4">Conocimiento y precios</Typography><Typography color="text.secondary">Fuente estructurada utilizada para cotizaciones y respuestas verificables.</Typography></Box>
    {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : null}
    <Paper sx={{ p: 3 }}><Typography variant="h6" sx={{ mb: 2 }}>Contexto dinámico</Typography>
      <Grid container spacing={2}>{['global','office'].map((scope) => <Grid item xs={12} md={6} key={scope}>
        <TextField fullWidth multiline minRows={5} label={scope === 'global' ? 'Contexto global' : 'Contexto de esta oficina'} value={contexts[scope]?.content || ''}
          onChange={(e) => setContexts((x) => ({ ...x, [scope]: { ...x[scope], content: e.target.value } }))} />
        <Button sx={{ mt: 1 }} onClick={() => saveContext(scope)}>Guardar</Button></Grid>)}</Grid>
    </Paper>
    <Box><Typography variant="h5" sx={{ mb: 1 }}>Servicios</Typography>{catalog.map((service) => <Accordion key={service.id}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={700}>{service.name}</Typography><Chip size="small" label={service.code} /><Chip size="small" color={service.active ? 'success' : 'default'} label={service.active ? 'Activo' : 'Inactivo'} /></Stack></AccordionSummary>
      <AccordionDetails><Stack spacing={2}><TextField label="Descripción" multiline value={service.description || ''} onChange={(e) => patchService(service.id,'description',e.target.value)} />
        <TextField label="Proceso" multiline value={service.process_summary || ''} onChange={(e) => patchService(service.id,'process_summary',e.target.value)} />
        <Grid container spacing={2}><Grid item xs={12} md={6}><TextField fullWidth label="Tiempo estimado" value={service.estimated_time || ''} onChange={(e) => patchService(service.id,'estimated_time',e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Advertencias" value={service.warnings || ''} onChange={(e) => patchService(service.id,'warnings',e.target.value)} /></Grid></Grid>
        <FormControlLabel control={<Switch checked={service.active} onChange={(e) => patchService(service.id,'active',e.target.checked)} />} label="Servicio activo" />
        <Button onClick={() => saveService(service)} sx={{ alignSelf: 'flex-start' }}>Guardar servicio</Button>
        <Typography fontWeight={700}>Precios separados</Typography>{service.prices.map((price) => <Stack key={price.id} direction={{ xs:'column',md:'row' }} spacing={1} alignItems={{ md:'center' }}>
          <Chip label={price.category} /><TextField size="small" label="Concepto" value={price.label} onChange={(e)=>patchPrice(service.id,price.id,'label',e.target.value)} />
          <TextField size="small" type="number" label="Monto" value={price.amount ?? ''} onChange={(e)=>patchPrice(service.id,price.id,'amount',e.target.value)} />
          <TextField select size="small" value={price.currency} onChange={(e)=>patchPrice(service.id,price.id,'currency',e.target.value)}><MenuItem value="MXN">MXN</MenuItem><MenuItem value="USD">USD</MenuItem></TextField>
          <Button onClick={()=>savePrice(price)}>Guardar</Button></Stack>)}
        <Typography fontWeight={700}>Requisitos</Typography>{service.requirements.map((r)=><Stack key={r.id} direction={{xs:'column',md:'row'}} spacing={1}><TextField fullWidth size="small" value={r.requirement} onChange={(e)=>patchRequirement(service.id,r.id,e.target.value)}/><Button onClick={()=>saveRequirement(r)}>Guardar</Button></Stack>)}
        <Button variant="outlined" onClick={()=>addRequirement(service)} sx={{alignSelf:'flex-start'}}>Agregar requisito</Button>
      </Stack></AccordionDetails></Accordion>)}</Box>
    <Paper sx={{ p:3 }}><Typography variant="h5">Promociones</Typography><Stack spacing={2} sx={{ my:2 }}>{promotions.map((p)=><Paper variant="outlined" sx={{p:2}} key={p.id}><Grid container spacing={1} alignItems="center"><Grid item xs={12} md={3}><TextField fullWidth size="small" label="Nombre" value={p.name} onChange={(e)=>patchPromotion(p.id,'name',e.target.value)}/></Grid><Grid item xs={12} md={4}><TextField fullWidth size="small" label="Texto comercial" value={p.commercial_text||''} onChange={(e)=>patchPromotion(p.id,'commercial_text',e.target.value)}/></Grid><Grid item xs={6} md={2}><TextField fullWidth size="small" type="number" label="Porcentaje" value={p.percentage??''} onChange={(e)=>patchPromotion(p.id,'percentage',e.target.value)}/></Grid><Grid item xs={6} md={2}><FormControlLabel control={<Switch checked={p.active} onChange={()=>togglePromotion(p)}/>} label={p.active?'Activa':'Inactiva'}/></Grid><Grid item xs={12} md={1}><Button onClick={()=>savePromotion(p)}>Guardar</Button></Grid><Grid item xs={12}><TextField fullWidth size="small" label="Términos" value={p.terms||''} onChange={(e)=>patchPromotion(p.id,'terms',e.target.value)}/></Grid></Grid></Paper>)}</Stack>
      <Grid container spacing={2} component="form" onSubmit={createPromotion}><Grid item xs={12} md={5}><TextField required fullWidth label="Nueva promoción" value={newPromotion.name} onChange={(e)=>setNewPromotion((p)=>({...p,name:e.target.value}))} /></Grid>
        <Grid item xs={6} md={3}><TextField select fullWidth label="Tipo" value={newPromotion.type} onChange={(e)=>setNewPromotion((p)=>({...p,type:e.target.value}))}><MenuItem value="percentage">Porcentaje</MenuItem><MenuItem value="fixed_amount">Monto fijo</MenuItem><MenuItem value="special_price">Precio especial</MenuItem><MenuItem value="promotional_message">Mensaje</MenuItem></TextField></Grid>
        <Grid item xs={6} md={2}><TextField fullWidth type="number" label="Porcentaje" value={newPromotion.percentage} onChange={(e)=>setNewPromotion((p)=>({...p,percentage:e.target.value}))} /></Grid><Grid item xs={12} md={2}><Button type="submit" variant="contained">Crear</Button></Grid></Grid>
    </Paper>
  </Stack>;
}
