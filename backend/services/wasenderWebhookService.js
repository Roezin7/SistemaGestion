const db = require('../db');
const adapter = require('../integrations/wasender/WasenderAdapter');
const { extractAdCodes, normalizePhone } = require('../utils/phone');
const logger = require('../utils/structuredLogger');
const agentOrchestrator = require('./agentOrchestratorService');
const followupService = require('./followupService');
const reactivationService = require('./reactivationService');

const MAX_ATTEMPTS = 5;

const statusRank = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

function asDate(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function syntheticMessageId(eventId, index) {
  return `webhook:${eventId}:${index}`;
}

async function enqueueWebhook(connection, eventType, payload) {
  const sanitizedPayload = logger.redactSecrets(payload);
  const dedupeKey = adapter.buildDedupeKey(payload);
  const result = await db.query(
    `INSERT INTO webhook_events
      (oficina_id, connection_id, provider, event_type, dedupe_key, payload)
     VALUES ($1, $2, 'wasender', $3, $4, $5::jsonb)
     ON CONFLICT (connection_id, event_type, dedupe_key) DO NOTHING
     RETURNING id`,
    [connection.oficina_id, connection.id, eventType, dedupeKey, JSON.stringify(sanitizedPayload)]
  );

  return {
    accepted: result.rows.length === 1,
    duplicate: result.rows.length === 0,
    event_id: result.rows[0]?.id || null,
  };
}

async function claimNextEvent() {
  return db.withTransaction(async (client) => {
    const result = await client.query(
      `SELECT *
         FROM webhook_events
        WHERE attempts < $1
          AND (
            status = 'received'
            OR (status = 'processing' AND processing_started_at < NOW() - INTERVAL '5 minutes')
          )
        ORDER BY received_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1`,
      [MAX_ATTEMPTS]
    );

    if (!result.rows[0]) return null;

    const claimed = await client.query(
      `UPDATE webhook_events
          SET status = 'processing',
              processing_started_at = NOW(),
              attempts = attempts + 1,
              error_message = NULL,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [result.rows[0].id]
    );
    return claimed.rows[0];
  });
}

function conversationLookup(connectionId, remoteJid, phone) {
  const conditions = [];
  const params = [connectionId];
  if (remoteJid) {
    params.push(remoteJid);
    conditions.push(`remote_jid = $${params.length}`);
  }
  if (phone) {
    params.push(phone);
    conditions.push(`phone_normalized = $${params.length}`);
  }
  return { conditions, params };
}

async function getOrCreateConversation(client, event, normalized) {
  const lookup = conversationLookup(event.connection_id, normalized.remoteJid, normalized.phoneNormalized);
  if (!lookup.conditions.length) {
    throw new Error('El mensaje no contiene un identificador remoto utilizable');
  }

  let result = await client.query(
    `SELECT * FROM conversations
      WHERE connection_id = $1 AND (${lookup.conditions.join(' OR ')})
      ORDER BY CASE WHEN remote_jid = $2 THEN 0 ELSE 1 END, id
      FOR UPDATE
      LIMIT 1`,
    lookup.params.length > 1 ? lookup.params : [event.connection_id, null]
  );
  if (result.rows[0]) return result.rows[0];

  await client.query(
    `INSERT INTO conversations
      (oficina_id, connection_id, remote_jid, phone_normalized, display_name,
       source_type, attention_mode, automation_enabled)
     VALUES ($1, $2, $3, $4, $5, 'unknown', 'humano', FALSE)
     ON CONFLICT DO NOTHING`,
    [
      event.oficina_id,
      event.connection_id,
      normalized.remoteJid,
      normalized.phoneNormalized,
      normalized.displayName,
    ]
  );

  result = await client.query(
    `SELECT * FROM conversations
      WHERE connection_id = $1 AND (${lookup.conditions.join(' OR ')})
      FOR UPDATE
      LIMIT 1`,
    lookup.params
  );
  if (!result.rows[0]) throw new Error('No fue posible crear la conversación');
  return result.rows[0];
}

async function findActiveClientByPhone(client, phone) {
  if (!phone) return null;
  const result = await client.query(
    `SELECT id, oficina_id
       FROM clientes
      WHERE activo = TRUE AND telefono_normalizado = $1
      ORDER BY id
      LIMIT 1`,
    [phone]
  );
  return result.rows[0] || null;
}

async function resolveAdSource(client, oficinaId, text) {
  const codes = extractAdCodes(text);
  if (!codes.length) return { source: null, ambiguous: false };
  const result = await client.query(
    `SELECT * FROM ad_sources
      WHERE oficina_id = $1 AND active = TRUE AND UPPER(code) = ANY($2::text[])
      ORDER BY id`,
    [oficinaId, codes]
  );
  return {
    source: result.rows.length === 1 ? result.rows[0] : null,
    ambiguous: result.rows.length > 1,
  };
}

async function resolveProspect(client, event, normalized, adSource) {
  if (!normalized.phoneNormalized) return { prospect: null, ambiguous: false };
  const matches = await client.query(
    `SELECT * FROM prospectos
      WHERE oficina_id = $1 AND telefono_normalizado = $2
      ORDER BY id`,
    [event.oficina_id, normalized.phoneNormalized]
  );
  if (matches.rows.length > 1) return { prospect: null, ambiguous: true };

  if (matches.rows[0]) {
    const updated = await client.query(
      `UPDATE prospectos
          SET fuente_tipo = 'meta_ad',
              codigo_anuncio = $2,
              origen_confirmado_at = COALESCE(origen_confirmado_at, NOW()),
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [matches.rows[0].id, adSource.code]
    );
    return { prospect: updated.rows[0], ambiguous: false };
  }

  const suffix = normalized.phoneNormalized.slice(-4);
  const created = await client.query(
    `INSERT INTO prospectos
      (oficina_id, nombre, telefono, telefono_normalizado, origen, fuente_tipo,
       codigo_anuncio, origen_confirmado_at, estado)
     VALUES ($1, $2, $3, $3, 'meta_ad', 'meta_ad', $4, NOW(), 'nuevo')
     RETURNING *`,
    [
      event.oficina_id,
      normalized.displayName || `WhatsApp ${suffix}`,
      normalized.phoneNormalized,
      adSource.code,
    ]
  );
  return { prospect: created.rows[0], ambiguous: false };
}

async function classifyFirstInbound(client, event, conversation, normalized) {
  const adMatch = await resolveAdSource(client, event.oficina_id, normalized.body);
  const activeClient = await findActiveClientByPhone(client, normalized.phoneNormalized);
  const humanAlreadyIntervened = Boolean(conversation.human_intervened_at || conversation.last_outbound_at);

  let sourceType = 'organic';
  let attentionMode = 'humano';
  let automationEnabled = false;
  let blockReason = null;
  let adSourceId = null;
  let adSnapshot = null;
  let prospectId = null;

  if (adMatch.ambiguous) {
    sourceType = 'meta_ad';
    blockReason = 'ambiguous_ad_code';
  } else if (adMatch.source) {
    sourceType = 'meta_ad';
    adSourceId = adMatch.source.id;
    adSnapshot = {
      code: adMatch.source.code,
      campaign_name: adMatch.source.campaign_name,
      name: adMatch.source.name,
      service_code: adMatch.source.service_code,
    };

    if (!normalized.phoneNormalized) {
      blockReason = 'unresolved_phone';
    } else if (activeClient) {
      blockReason = 'active_client';
    } else if (humanAlreadyIntervened) {
      blockReason = 'human_intervention';
    } else {
      const prospectResult = await resolveProspect(client, event, normalized, adMatch.source);
      prospectId = prospectResult.prospect?.id || null;
      if (prospectResult.ambiguous) {
        blockReason = 'ambiguous_prospect';
      } else {
        attentionMode = 'automatico';
        automationEnabled = true;
      }
    }
  }

  if (activeClient) {
    attentionMode = 'humano';
    automationEnabled = false;
    blockReason = 'active_client';
  }

  const result = await client.query(
    `UPDATE conversations
        SET source_type = $2::varchar,
            ad_source_id = $3,
            ad_code_snapshot = $4,
            origin_confirmed_at = CASE WHEN $2::varchar = 'meta_ad' THEN COALESCE(origin_confirmed_at, NOW()) ELSE origin_confirmed_at END,
            prospecto_id = $5,
            attention_mode = $6,
            automation_enabled = $7,
            automation_block_reason = $8,
            first_inbound_at = COALESCE(first_inbound_at, $9),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [
      conversation.id,
      sourceType,
      adSourceId,
      adSnapshot?.code || null,
      prospectId,
      attentionMode,
      automationEnabled,
      blockReason,
      asDate(normalized.providerTimestamp),
    ]
  );
  return result.rows[0];
}

async function updateMessageStatus(client, normalized) {
  if (!normalized.externalMessageId) return false;
  const current = await client.query(
    `SELECT id, status FROM conversation_messages
      WHERE connection_id = $1 AND external_message_id = $2
      FOR UPDATE`,
    [normalized.connectionId, normalized.externalMessageId]
  );
  if (!current.rows[0]) return false;

  const oldRank = statusRank[current.rows[0].status] ?? -1;
  const newRank = statusRank[normalized.status] ?? -1;
  if (newRank < oldRank && normalized.status !== 'failed') return true;

  const statusDate = asDate(normalized.providerTimestamp);
  await client.query(
    `UPDATE conversation_messages
        SET status = $2::varchar,
            sent_at = CASE WHEN $2::varchar = 'sent' THEN COALESCE(sent_at, $3) ELSE sent_at END,
            delivered_at = CASE WHEN $2::varchar = 'delivered' THEN COALESCE(delivered_at, $3) ELSE delivered_at END,
            read_at = CASE WHEN $2::varchar = 'read' THEN COALESCE(read_at, $3) ELSE read_at END,
            failed_at = CASE WHEN $2::varchar = 'failed' THEN COALESCE(failed_at, $3) ELSE failed_at END,
            updated_at = NOW()
      WHERE id = $1`,
    [current.rows[0].id, normalized.status, statusDate]
  );
  return true;
}

async function persistMessage(client, event, normalized, index) {
  normalized.connectionId = event.connection_id;
  const externalId = normalized.externalMessageId || syntheticMessageId(event.id, index);
  const existing = await client.query(
    `SELECT id FROM conversation_messages
      WHERE connection_id = $1 AND external_message_id = $2`,
    [event.connection_id, externalId]
  );
  if (existing.rows[0]) {
    await updateMessageStatus(client, { ...normalized, externalMessageId: externalId });
    return;
  }

  let conversation = await getOrCreateConversation(client, event, normalized);
  if (normalized.direction === 'inbound' && !conversation.first_inbound_at) {
    conversation = await classifyFirstInbound(client, event, conversation, normalized);
  }

  const messageTime = asDate(normalized.providerTimestamp);
  const inserted = await client.query(
    `INSERT INTO conversation_messages
      (oficina_id, conversation_id, connection_id, provider, external_message_id,
       remote_jid, direction, sender_type, source, message_type, body,
       media_metadata, status, provider_timestamp, sent_at)
     VALUES ($1, $2, $3, 'wasender', $4, $5, $6::varchar, $7, $8, $9, $10, $11::jsonb, $12, $13::timestamptz,
       CASE WHEN $6::varchar = 'outbound' THEN $13::timestamptz ELSE NULL END)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      event.oficina_id,
      conversation.id,
      event.connection_id,
      externalId,
      normalized.remoteJid,
      normalized.direction,
      normalized.senderType,
      normalized.source,
      normalized.messageType,
      normalized.body,
      JSON.stringify(normalized.mediaMetadata || {}),
      normalized.status,
      messageTime,
    ]
  );
  if (!inserted.rows[0]) return;

  if (normalized.direction === 'inbound') {
    await client.query(
      `UPDATE conversations
          SET remote_jid = COALESCE(remote_jid, $2),
              phone_normalized = COALESCE(phone_normalized, $3),
              display_name = COALESCE(display_name, $4),
              first_inbound_at = COALESCE(first_inbound_at, $5),
              last_inbound_at = $5,
              last_message_at = $5,
              last_message_preview = LEFT(COALESCE($6, '[multimedia]'), 500),
              unread_count = unread_count + 1,
              updated_at = NOW()
        WHERE id = $1`,
      [conversation.id, normalized.remoteJid, normalized.phoneNormalized, normalized.displayName, messageTime, normalized.body]
    );
    await agentOrchestrator.enqueueForInbound(client, conversation, inserted.rows[0].id);
    await followupService.cancelForConversation(client, conversation.id, 'prospect_replied');
    await reactivationService.cancelQueued(client, conversation.id, 'prospect_replied');
  } else {
    await followupService.cancelForConversation(client, conversation.id, 'human_replied');
    await reactivationService.cancelQueued(client, conversation.id, 'human_replied');
    await client.query(
      `UPDATE conversations
          SET attention_mode = 'humano',
              automation_enabled = FALSE,
              automation_block_reason = 'human_intervention',
              automation_version = automation_version + 1,
              human_intervened_at = COALESCE(human_intervened_at, $2),
              last_outbound_at = $2,
              last_message_at = $2,
              last_message_preview = LEFT(COALESCE($3, '[multimedia]'), 500),
              updated_at = NOW()
        WHERE id = $1`,
      [conversation.id, messageTime, normalized.body]
    );
  }
}

async function updateConnectionStatus(client, event, normalized) {
  await client.query(
    `UPDATE whatsapp_connections
        SET connection_status = $2::varchar,
            last_event_at = NOW(),
            last_error = CASE WHEN $2::varchar IN ('connected', 'open') THEN NULL ELSE last_error END,
            updated_at = NOW()
      WHERE id = $1`,
    [event.connection_id, normalized.status || 'unknown']
  );
}

async function processClaimedEvent(event) {
  try {
    await db.withTransaction(async (client) => {
      const normalizedResult = adapter.normalizeWebhook(event.payload);
      const normalizedEvents = normalizedResult.events;
      for (let index = 0; index < normalizedEvents.length; index += 1) {
        const normalized = normalizedEvents[index];
        if (normalized.kind === 'message') {
          if (/(@g\.us|@newsletter|status@broadcast)$/i.test(normalized.remoteJid || '')) {
            continue;
          }
          if (!normalized.phoneNormalized && normalized.remoteJid) {
            normalized.phoneNormalized = normalizePhone(normalized.remoteJid);
          }
          await persistMessage(client, event, normalized, index);
        } else if (normalized.kind === 'status') {
          normalized.connectionId = event.connection_id;
          const updated = await updateMessageStatus(client, normalized);
          if (!updated) {
            const error = new Error('El estado llego antes que el mensaje; se reintentara');
            error.code = 'MESSAGE_NOT_REGISTERED_YET';
            throw error;
          }
        } else if (normalized.kind === 'session_status') {
          await updateConnectionStatus(client, event, normalized);
        }
      }

      await client.query(
        `UPDATE webhook_events
            SET status = 'processed', processed_at = NOW(), error_message = NULL, updated_at = NOW()
          WHERE id = $1`,
        [event.id]
      );
      await client.query(
        `UPDATE whatsapp_connections SET last_event_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [event.connection_id]
      );
    });
    logger.info('wasender_webhook_processed',{event_id:event.id,connection_id:event.connection_id,event_type:event.event_type});
    return true;
  } catch (error) {
    const finalFailure = event.attempts >= MAX_ATTEMPTS;
    const retryStatus = finalFailure ? 'failed' : 'processing';
    await db.query(
      `UPDATE webhook_events
          SET status = $2::varchar,
              error_message = $3,
              processed_at = CASE WHEN $2::varchar = 'failed' THEN NOW() ELSE processed_at END,
              updated_at = NOW()
        WHERE id = $1`,
      [event.id, retryStatus, String(error.message || error).slice(0, 1000)]
    );
    logger.error('wasender_webhook_processing_failed', {
      event_id: event.id,
      attempt: event.attempts,
      final_failure: finalFailure,
      error: error.message,
    });
    return false;
  }
}

async function processNextEvent() {
  const event = await claimNextEvent();
  if (!event) return false;
  await processClaimedEvent(event);
  return true;
}

module.exports = {
  enqueueWebhook,
  processNextEvent,
  processClaimedEvent,
  claimNextEvent,
};
