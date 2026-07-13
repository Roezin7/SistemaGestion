const express = require('express');
const { verificarToken } = require('../middleware');
const { registrarHistorial } = require('../utils/historial');
const { createRateLimiter, safeCompareStrings } = require('../utils/security');
const logger = require('../utils/structuredLogger');
const settingsService = require('../services/whatsappSettingsService');
const adSourceService = require('../services/adSourceService');
const webhookService = require('../services/wasenderWebhookService');

const router = express.Router();
const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyPrefix: 'wasender-webhook',
  message: 'Limite temporal de webhooks excedido',
});

function sendError(res, error, fallback) {
  if (error.code === '23505') {
    return res.status(409).json({ success: false, message: 'El registro ya existe' });
  }
  const status = Number(error.status) || 500;
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallback : error.message,
  });
}

router.post('/webhook/:publicId', webhookRateLimiter, async (req, res) => {
  const eventType = String(req.body?.event || '').trim();
  if (!eventType || !req.body?.data || typeof req.body.data !== 'object') {
    return res.status(400).json({ success: false, message: 'Payload de webhook invalido' });
  }

  try {
    const connection = await settingsService.getConnectionByPublicId(req.params.publicId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Webhook no encontrado' });
    }
    if (!connection.enabled) {
      return res.status(503).json({ success: false, message: 'Conexion deshabilitada' });
    }

    const expectedSignature = settingsService.decryptConnectionWebhookSecret(connection);
    const receivedSignature = req.get('X-Webhook-Signature');
    if (!expectedSignature || !safeCompareStrings(receivedSignature, expectedSignature)) {
      logger.warn('wasender_webhook_rejected', {
        connection_id: connection.id,
        event_type: eventType,
        reason: 'invalid_signature',
      });
      return res.status(401).json({ success: false, message: 'Firma de webhook invalida' });
    }

    const result = await webhookService.enqueueWebhook(connection, eventType, req.body);
    logger.info('wasender_webhook_received', {
      connection_id: connection.id,
      event_id: result.event_id,
      event_type: eventType,
      duplicate: result.duplicate,
    });
    return res.status(200).json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    logger.error('wasender_webhook_enqueue_failed', {
      event_type: eventType,
      error: error.message,
    });
    return res.status(500).json({ success: false, message: 'No se pudo registrar el webhook' });
  }
});

router.use(verificarToken);

router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsService.getOfficeSettings(req.user.oficina_id);
    return res.json({
      ...settings,
      webhook_path: `/api/whatsapp/webhook/${settings.connection.public_id}`,
    });
  } catch (error) {
    return sendError(res, error, 'No se pudo cargar la configuracion de WhatsApp');
  }
});
router.get('/failures',async(req,res)=>{try{return res.json(await settingsService.listOperationalFailures(req.user.oficina_id));}catch(error){return sendError(res,error,'No se pudieron cargar los fallos operativos');}});

router.put('/settings', async (req, res) => {
  try {
    const settings = await settingsService.updateOfficeSettings(
      req.user.oficina_id,
      req.user.id,
      req.body || {}
    );
    await registrarHistorial(req, 'Se actualizo la configuracion de WhatsApp y agente');
    return res.json({
      ...settings,
      webhook_path: `/api/whatsapp/webhook/${settings.connection.public_id}`,
    });
  } catch (error) {
    return sendError(res, error, 'No se pudo actualizar la configuracion de WhatsApp');
  }
});

router.get('/ad-sources', async (req, res) => {
  try {
    return res.json(await adSourceService.listAdSources(req.user.oficina_id));
  } catch (error) {
    return sendError(res, error, 'No se pudieron cargar las fuentes publicitarias');
  }
});

router.post('/ad-sources', async (req, res) => {
  try {
    const source = await adSourceService.createAdSource(
      req.user.oficina_id,
      req.user.id,
      req.body || {}
    );
    await registrarHistorial(req, `Se agrego la fuente publicitaria ${source.code}`);
    return res.status(201).json(source);
  } catch (error) {
    return sendError(res, error, 'No se pudo registrar la fuente publicitaria');
  }
});

router.put('/ad-sources/:id', async (req, res) => {
  try {
    const source = await adSourceService.updateAdSource(
      req.user.oficina_id,
      req.params.id,
      req.user.id,
      req.body || {}
    );
    if (!source) return res.status(404).json({ success: false, message: 'Fuente no encontrada' });
    await registrarHistorial(req, `Se actualizo la fuente publicitaria ${source.code}`);
    return res.json(source);
  } catch (error) {
    return sendError(res, error, 'No se pudo actualizar la fuente publicitaria');
  }
});

module.exports = router;
