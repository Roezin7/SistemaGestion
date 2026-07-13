const crypto = require('crypto');
const db = require('../db');
const followupService = require('./followupService');
const reactivationService = require('./reactivationService');

const PAGE_SIZE = 40;

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function listConversations(oficinaId, query = {}) {
  const params = [oficinaId];
  const filters = ['c.oficina_id = $1'];
  if (query.mode && ['automatico', 'humano', 'pausado'].includes(query.mode)) {
    params.push(query.mode);
    filters.push(`c.attention_mode = $${params.length}`);
  }
  if (query.source && ['unknown', 'organic', 'meta_ad'].includes(query.source)) {
    params.push(query.source);
    filters.push(`c.source_type = $${params.length}`);
  }
  if (query.search) {
    params.push(`%${String(query.search).trim()}%`);
    filters.push(`(c.display_name ILIKE $${params.length} OR c.phone_normalized ILIKE $${params.length})`);
  }
  const beforeId = parseId(query.before_id);
  if (beforeId) {
    params.push(beforeId);
    filters.push(`c.id < $${params.length}`);
  }
  params.push(Math.min(100, Math.max(1, parseId(query.limit) || PAGE_SIZE)));

  const result = await db.query(
    `SELECT c.id, c.phone_normalized, c.display_name, c.source_type, c.ad_code_snapshot,
            c.status, c.attention_mode, c.automation_enabled, c.automation_block_reason,
            c.assigned_user_id, c.last_message_at, c.last_message_preview, c.unread_count,
            c.human_intervened_at, c.do_not_contact_at,
            p.id AS prospecto_id, p.nombre AS prospecto_nombre,
            u.nombre AS assigned_user_name
       FROM conversations c
       LEFT JOIN prospectos p ON p.id = c.prospecto_id AND p.oficina_id = c.oficina_id
       LEFT JOIN usuarios u ON u.id = c.assigned_user_id
      WHERE ${filters.join(' AND ')}
      ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC
      LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

async function getConversation(oficinaId, conversationId) {
  const result = await db.query(
    `SELECT c.*, p.nombre AS prospecto_nombre, p.telefono AS prospecto_telefono,
            a.name AS ad_source_name, a.campaign_name, u.nombre AS assigned_user_name,
            cs.summary,cs.collected_data,le.strength AS lead_strength,le.intent,le.service_code,
            ap.id AS appointment_id,ap.scheduled_at AS appointment_at,ap.modality AS appointment_modality,
            ap.extraordinary AS appointment_extraordinary
       FROM conversations c
       LEFT JOIN prospectos p ON p.id = c.prospecto_id AND p.oficina_id = c.oficina_id
       LEFT JOIN ad_sources a ON a.id = c.ad_source_id AND a.oficina_id = c.oficina_id
       LEFT JOIN usuarios u ON u.id = c.assigned_user_id
       LEFT JOIN conversation_summaries cs ON cs.conversation_id=c.id
       LEFT JOIN LATERAL (SELECT * FROM lead_evaluations x WHERE x.conversation_id=c.id ORDER BY x.created_at DESC LIMIT 1) le ON TRUE
       LEFT JOIN LATERAL (SELECT * FROM appointments x WHERE x.conversation_id=c.id AND x.status='scheduled' ORDER BY x.scheduled_at LIMIT 1) ap ON TRUE
      WHERE c.id = $1 AND c.oficina_id = $2`,
    [conversationId, oficinaId]
  );
  return result.rows[0] || null;
}

async function listMessages(oficinaId, conversationId, query = {}) {
  const params = [conversationId, oficinaId];
  const filters = ['m.conversation_id = $1', 'm.oficina_id = $2'];
  const beforeId = parseId(query.before_id);
  if (beforeId) {
    params.push(beforeId);
    filters.push(`m.id < $${params.length}`);
  }
  params.push(Math.min(100, Math.max(1, parseId(query.limit) || 60)));
  const result = await db.query(
    `SELECT m.id, m.external_message_id, m.client_message_id, m.direction, m.sender_type,
            m.source, m.message_type, m.body, m.media_metadata, m.status,
            m.provider_timestamp, m.sent_at, m.delivered_at, m.read_at, m.failed_at,
            m.error_message, m.created_at, u.nombre AS created_by_name
       FROM conversation_messages m
       LEFT JOIN usuarios u ON u.id = m.created_by
      WHERE ${filters.join(' AND ')}
      ORDER BY m.id DESC
      LIMIT $${params.length}`,
    params
  );
  return result.rows.reverse();
}

async function queueManualMessage(oficinaId, userId, conversationId, body) {
  const text = String(body || '').trim();
  if (!text || text.length > 4000) {
    const error = new Error('El mensaje debe contener entre 1 y 4000 caracteres');
    error.status = 400;
    throw error;
  }

  return db.withTransaction(async (client) => {
    const conversationResult = await client.query(
      `SELECT c.*, wc.enabled AS connection_enabled
         FROM conversations c
         INNER JOIN whatsapp_connections wc ON wc.id = c.connection_id
        WHERE c.id = $1 AND c.oficina_id = $2
        FOR UPDATE OF c`,
      [conversationId, oficinaId]
    );
    const conversation = conversationResult.rows[0];
    if (!conversation) return null;
    if (conversation.do_not_contact_at) {
      const error = new Error('La conversación está marcada como no contactar');
      error.status = 409;
      throw error;
    }
    if (!conversation.connection_enabled) {
      const error = new Error('La conexión de WhatsApp está deshabilitada');
      error.status = 409;
      throw error;
    }
    if (!conversation.phone_normalized) {
      const error = new Error('La conversación no tiene un teléfono resoluble');
      error.status = 409;
      throw error;
    }

    const clientMessageId = crypto.randomUUID();
    const messageResult = await client.query(
      `INSERT INTO conversation_messages
        (oficina_id, conversation_id, connection_id, client_message_id, direction,
         sender_type, source, message_type, body, status, queued_at, provider_timestamp, created_by)
       VALUES ($1, $2, $3, $4, 'outbound', 'employee', 'app', 'text', $5, 'pending', NOW(), NOW(), $6)
       RETURNING *`,
      [oficinaId, conversation.id, conversation.connection_id, clientMessageId, text, userId]
    );
    await client.query(
      `INSERT INTO outbound_message_jobs
        (oficina_id, connection_id, conversation_id, message_id)
       VALUES ($1, $2, $3, $4)`,
      [oficinaId, conversation.connection_id, conversation.id, messageResult.rows[0].id]
    );
    await client.query(
      `UPDATE conversations
          SET attention_mode = 'humano', automation_enabled = FALSE,
              automation_block_reason = 'human_intervention',
              automation_version = automation_version + 1,
              assigned_user_id = COALESCE(assigned_user_id, $2),
              taken_at = COALESCE(taken_at, NOW()),
              human_intervened_at = COALESCE(human_intervened_at, NOW()),
              last_outbound_at = NOW(), last_message_at = NOW(),
              last_message_preview = LEFT($3, 500), updated_at = NOW()
        WHERE id = $1`,
      [conversation.id, userId, text]
    );
    await followupService.cancelForConversation(client, conversation.id, 'human_replied');
    await reactivationService.cancelQueued(client, conversation.id, 'human_replied');
    return messageResult.rows[0];
  });
}

async function setConversationMode(oficinaId, userId, conversationId, action) {
  return db.withTransaction(async (client) => {
    const result = await client.query(
      `SELECT * FROM conversations WHERE id = $1 AND oficina_id = $2 FOR UPDATE`,
      [conversationId, oficinaId]
    );
    const conversation = result.rows[0];
    if (!conversation) return null;

    if (action === 'resume') {
      if (conversation.source_type !== 'meta_ad' || conversation.do_not_contact_at) {
        const error = new Error('Solo una conversación publicitaria contactable puede reactivar el modo automático');
        error.status = 409;
        throw error;
      }
      const activeClient = await client.query(
        'SELECT 1 FROM clientes WHERE activo = TRUE AND telefono_normalizado = $1 LIMIT 1',
        [conversation.phone_normalized]
      );
      if (activeClient.rows[0]) {
        const error = new Error('El teléfono pertenece a un cliente activo');
        error.status = 409;
        throw error;
      }
      await client.query(
        `UPDATE conversations SET attention_mode = 'automatico', automation_enabled = TRUE,
          automation_block_reason = NULL, paused_at = NULL, automation_version = automation_version + 1,
          updated_at = NOW() WHERE id = $1`,
        [conversation.id]
      );
    } else {
      await followupService.cancelForConversation(client, conversation.id, `mode_${action}`);
      await reactivationService.cancelQueued(client, conversation.id, `mode_${action}`);
      const mode = action === 'pause' ? 'pausado' : 'humano';
      await client.query(
        `UPDATE conversations SET attention_mode = $2::varchar, automation_enabled = FALSE,
          automation_block_reason = $3, automation_version = automation_version + 1,
          assigned_user_id = CASE WHEN $2::varchar = 'humano' THEN COALESCE(assigned_user_id, $4) ELSE assigned_user_id END,
          taken_at = CASE WHEN $2::varchar = 'humano' THEN COALESCE(taken_at, NOW()) ELSE taken_at END,
          paused_at = CASE WHEN $2::varchar = 'pausado' THEN NOW() ELSE paused_at END,
          human_intervened_at = CASE WHEN $2::varchar = 'humano' THEN COALESCE(human_intervened_at, NOW()) ELSE human_intervened_at END,
          updated_at = NOW() WHERE id = $1`,
        [conversation.id, mode, action === 'pause' ? 'user_paused' : 'human_intervention', userId]
      );
    }
    return getConversationWithClient(client, oficinaId, conversation.id);
  });
}

async function getConversationWithClient(client, oficinaId, id) {
  const result = await client.query(
    'SELECT * FROM conversations WHERE id = $1 AND oficina_id = $2',
    [id, oficinaId]
  );
  return result.rows[0] || null;
}

async function markRead(oficinaId, conversationId) {
  const result = await db.query(
    `UPDATE conversations SET unread_count = 0, updated_at = NOW()
      WHERE id = $1 AND oficina_id = $2 RETURNING id`,
    [conversationId, oficinaId]
  );
  return result.rows[0] || null;
}

async function markDoNotContact(oficinaId,userId,conversationId,reason){return db.withTransaction(async client=>{const row=(await client.query(`UPDATE conversations SET do_not_contact_at=NOW(),do_not_contact_reason=$3,
 attention_mode='humano',automation_enabled=FALSE,automation_block_reason='do_not_contact',automation_version=automation_version+1,
 assigned_user_id=COALESCE(assigned_user_id,$4),updated_at=NOW() WHERE id=$1 AND oficina_id=$2 RETURNING *`,[conversationId,oficinaId,String(reason||'Solicitud del contacto').slice(0,500),userId])).rows[0];if(!row)return null;
 await followupService.cancelForConversation(client,row.id,'do_not_contact');await reactivationService.cancelQueued(client,row.id,'do_not_contact');return row;});}

module.exports = {
  listConversations,
  getConversation,
  listMessages,
  queueManualMessage,
  setConversationMode,
  markRead,
  markDoNotContact,
};
