const express=require('express');const {verificarToken}=require('../middleware');const {registrarHistorial}=require('../utils/historial');const service=require('../services/appointmentService');
const router=express.Router();router.use(verificarToken);const fail=(res,e)=>res.status(e.status||500).json({message:e.status?e.message:'Error de agenda'});
router.get('/',async(req,res)=>{try{res.json(await service.listAppointments(req.user.oficina_id,req.query.from,req.query.to));}catch(e){fail(res,e);}});
router.get('/settings',async(req,res)=>{try{res.json(await service.getSettings(req.user.oficina_id));}catch(e){fail(res,e);}});
router.get('/advisors',async(req,res)=>{try{res.json(await service.listAdvisors(req.user.oficina_id));}catch(e){fail(res,e);}});
router.put('/settings',async(req,res)=>{try{const row=await service.updateSettings(req.user.oficina_id,req.user.id,req.body||{});await registrarHistorial(req,'Se actualizó configuración de agenda');res.json(row);}catch(e){fail(res,e);}});
router.post('/',async(req,res)=>{try{const row=await service.createAppointment(req.user.oficina_id,req.user.id,req.body?.conversation_id,req.body||{});if(!row)return res.status(404).json({message:'Conversación no encontrada'});await registrarHistorial(req,`Se agendó llamada ${row.id}`);res.status(201).json(row);}catch(e){fail(res,e);}});
module.exports=router;
