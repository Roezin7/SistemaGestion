const express = require('express');
const { verificarToken } = require('../middleware');
const { registrarHistorial } = require('../utils/historial');
const service = require('../services/conversationService');

const router = express.Router();
router.use(verificarToken);

function handleError(res, error, fallback) {
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : fallback,
  });
}

router.get('/', async (req, res) => {
  try {
    return res.json(await service.listConversations(req.user.oficina_id, req.query));
  } catch (error) {
    return handleError(res, error, 'No se pudieron cargar las conversaciones');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const conversation = await service.getConversation(req.user.oficina_id, req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.json(conversation);
  } catch (error) {
    return handleError(res, error, 'No se pudo cargar la conversación');
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const conversation = await service.getConversation(req.user.oficina_id, req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.json(await service.listMessages(req.user.oficina_id, req.params.id, req.query));
  } catch (error) {
    return handleError(res, error, 'No se pudieron cargar los mensajes');
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const message = await service.queueManualMessage(
      req.user.oficina_id,
      req.user.id,
      req.params.id,
      req.body?.text
    );
    if (!message) return res.status(404).json({ message: 'Conversación no encontrada' });
    await registrarHistorial(req, `Se encoló una respuesta manual en conversación ${req.params.id}`);
    return res.status(202).json(message);
  } catch (error) {
    return handleError(res, error, 'No se pudo encolar el mensaje');
  }
});

for (const action of ['pause', 'resume', 'handoff']) {
  router.post(`/:id/${action}`, async (req, res) => {
    try {
      const conversation = await service.setConversationMode(
        req.user.oficina_id, req.user.id, req.params.id, action
      );
      if (!conversation) return res.status(404).json({ message: 'Conversación no encontrada' });
      await registrarHistorial(req, `Se ejecutó ${action} en conversación ${req.params.id}`);
      return res.json(conversation);
    } catch (error) {
      return handleError(res, error, 'No se pudo cambiar el modo de la conversación');
    }
  });
}

router.post('/:id/read', async (req, res) => {
  try {
    const result = await service.markRead(req.user.oficina_id, req.params.id);
    if (!result) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, 'No se pudo marcar como leída');
  }
});
router.post('/:id/do-not-contact',async(req,res)=>{try{const row=await service.markDoNotContact(req.user.oficina_id,req.user.id,req.params.id,req.body?.reason);if(!row)return res.status(404).json({message:'Conversación no encontrada'});await registrarHistorial(req,`Se marcó no contactar en conversación ${req.params.id}`);res.json(row);}catch(e){handleError(res,e,'No se pudo marcar no contactar');}});

module.exports = router;
