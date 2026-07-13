const express = require('express');
const { verificarToken } = require('../middleware');
const { registrarHistorial } = require('../utils/historial');
const service = require('../services/knowledgeService');
const router = express.Router();
router.use(verificarToken);

const fail = (res, error) => res.status(error.status || 500).json({ message: error.status ? error.message : 'Error de conocimiento' });

router.get('/catalog', async (req,res)=>{ try { res.json(await service.getCatalog(req.user.oficina_id,{includeInactive:true})); } catch(e){ fail(res,e); } });
router.put('/services/:id', async (req,res)=>{ try { const row=await service.updateService(req.params.id,req.body||{}); if(!row)return res.status(404).json({message:'Servicio no encontrado'}); await registrarHistorial(req,`Se actualizó servicio ${row.code}`); res.json(row); } catch(e){ fail(res,e); } });
router.post('/prices', async (req,res)=>{ try { const row=await service.savePrice(req.user.oficina_id,req.user.id,req.body||{}); await registrarHistorial(req,`Se agregó precio ${row.id}`); res.status(201).json(row); } catch(e){ fail(res,e); } });
router.put('/prices/:id', async (req,res)=>{ try { const row=await service.savePrice(req.user.oficina_id,req.user.id,req.body||{},req.params.id); if(!row)return res.status(404).json({message:'Precio no encontrado'}); await registrarHistorial(req,`Se actualizó precio ${row.id}`); res.json(row); } catch(e){ fail(res,e); } });
router.post('/requirements', async (req,res)=>{ try { const row=await service.saveRequirement(req.body||{}); await registrarHistorial(req,`Se agregó requisito ${row.id}`); res.status(201).json(row); } catch(e){ fail(res,e); } });
router.put('/requirements/:id', async (req,res)=>{ try { const row=await service.saveRequirement(req.body||{},req.params.id); if(!row)return res.status(404).json({message:'Requisito no encontrado'}); await registrarHistorial(req,`Se actualizó requisito ${row.id}`); res.json(row); } catch(e){ fail(res,e); } });
router.get('/promotions', async (req,res)=>{ try { res.json(await service.listPromotions(req.user.oficina_id)); } catch(e){ fail(res,e); } });
router.post('/promotions', async (req,res)=>{ try { const row=await service.savePromotion(req.user.oficina_id,req.user.id,req.body||{}); await registrarHistorial(req,`Se creó promoción ${row.id}`); res.status(201).json(row); } catch(e){ fail(res,e); } });
router.put('/promotions/:id', async (req,res)=>{ try { const row=await service.savePromotion(req.user.oficina_id,req.user.id,req.body||{},req.params.id); if(!row)return res.status(404).json({message:'Promoción no encontrada'}); await registrarHistorial(req,`Se actualizó promoción ${row.id}`); res.json(row); } catch(e){ fail(res,e); } });
router.get('/context', async (req,res)=>{ try { res.json(await service.getContexts(req.user.oficina_id)); } catch(e){ fail(res,e); } });
router.put('/context', async (req,res)=>{ try { const row=await service.updateContext(req.user.oficina_id,req.user.id,req.body?.content,false); await registrarHistorial(req,'Se actualizó contexto de oficina'); res.json(row); } catch(e){ fail(res,e); } });
router.put('/context/global', async (req,res)=>{ try { const row=await service.updateContext(req.user.oficina_id,req.user.id,req.body?.content,true); await registrarHistorial(req,'Se actualizó contexto global'); res.json(row); } catch(e){ fail(res,e); } });
module.exports=router;
