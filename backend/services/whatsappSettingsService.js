const crypto = require('crypto');
const db = require('../db');
const { encryptSecret, decryptSecret } = require('../utils/credentialCrypto');
const { normalizePhone } = require('../utils/phone');

function normalizeOptionalText(value) {
  if (value === null || typeof value === 'undefined') return null;
  const text = String(value).trim();
  return text || null;
}

function mapSettingsRow(row) {
  const phoneRegistryReady = Boolean(row.system_phone_registry_ready);
  const globalAutomationEnabled = process.env.AGENT_AUTOMATION_ENABLED === 'true';
  return {
    connection: {
      id: row.connection_id,
      provider: row.provider || 'wasender',
      public_id: row.public_id,
      phone_number: row.phone_number,
      phone_normalized: row.phone_normalized,
      external_session_ref: row.external_session_ref,
      enabled: Boolean(row.connection_enabled),
      connection_status: row.connection_status || 'unconfigured',
      last_event_at: row.last_event_at,
      last_error: row.last_error,
      api_key_configured: Boolean(row.api_key_ciphertext),
      webhook_secret_configured: Boolean(row.webhook_secret_ciphertext || process.env.WASENDER_WEBHOOK_SECRET),
    },
    agent: {
      agent_enabled: Boolean(row.agent_enabled),
      effective_enabled: Boolean(
        row.agent_enabled
        && row.connection_enabled
        && phoneRegistryReady
        && globalAutomationEnabled
      ),
      global_automation_enabled: globalAutomationEnabled,
      notification_recipient: row.notification_recipient,
      additional_context: row.additional_context,
      timezone: row.timezone || 'America/Mexico_City',
      human_intervention_cooldown_minutes: row.human_intervention_cooldown_minutes ?? 60,
      followup_enabled: Boolean(row.followup_enabled),
      first_followup_minutes: row.first_followup_minutes ?? 120,
      second_followup_minutes: row.second_followup_minutes ?? 1440,
      appointments_enabled: Boolean(row.appointments_enabled),
      version: row.version || 1,
    },
    safety: {
      active_clients_total: Number(row.active_clients_total || 0),
      active_clients_without_phone: Number(row.active_clients_without_phone || 0),
      phone_registry_ready: phoneRegistryReady,
    },
  };
}

async function ensureOfficeSettings(oficinaId, client = db) {
  await client.query(
    `INSERT INTO whatsapp_connections (oficina_id, public_id)
     VALUES ($1, $2)
     ON CONFLICT (oficina_id, provider) DO NOTHING`,
    [oficinaId, crypto.randomBytes(24).toString('base64url')]
  );
  await client.query(
    `INSERT INTO agent_configurations (oficina_id)
     VALUES ($1)
     ON CONFLICT (oficina_id) DO NOTHING`,
    [oficinaId]
  );
}

async function getOfficeSettings(oficinaId, client = db) {
  await ensureOfficeSettings(oficinaId, client);
  const result = await client.query(
    `SELECT
       wc.id AS connection_id,
       wc.provider,
       wc.public_id,
       wc.phone_number,
       wc.phone_normalized,
       wc.external_session_ref,
       wc.api_key_ciphertext,
       wc.webhook_secret_ciphertext,
       wc.enabled AS connection_enabled,
       wc.connection_status,
       wc.last_event_at,
       wc.last_error,
       ac.agent_enabled,
       ac.notification_recipient,
       ac.additional_context,
       ac.timezone,
       ac.human_intervention_cooldown_minutes,
       ac.followup_enabled,
       ac.first_followup_minutes,
       ac.second_followup_minutes,
       ac.appointments_enabled,
       ac.version,
       (SELECT COUNT(*) FROM clientes c WHERE c.activo = TRUE AND c.oficina_id = wc.oficina_id)
         AS active_clients_total,
       (SELECT COUNT(*) FROM clientes c
         WHERE c.activo = TRUE AND c.oficina_id = wc.oficina_id AND c.telefono_normalizado IS NULL)
         AS active_clients_without_phone,
       NOT EXISTS (
         SELECT 1 FROM clientes c WHERE c.activo = TRUE AND c.telefono_normalizado IS NULL
       ) AS system_phone_registry_ready
     FROM whatsapp_connections wc
     INNER JOIN agent_configurations ac ON ac.oficina_id = wc.oficina_id
     WHERE wc.oficina_id = $1 AND wc.provider = 'wasender'`,
    [oficinaId]
  );
  return mapSettingsRow(result.rows[0]);
}

async function updateOfficeSettings(oficinaId, userId, input) {
  return db.withTransaction(async (client) => {
    await ensureOfficeSettings(oficinaId, client);

    const current = await client.query(
      `SELECT * FROM whatsapp_connections
       WHERE oficina_id = $1 AND provider = 'wasender'
       FOR UPDATE`,
      [oficinaId]
    );
    const connection = current.rows[0];
    const phoneNumber = Object.prototype.hasOwnProperty.call(input, 'phone_number')
      ? normalizeOptionalText(input.phone_number)
      : connection.phone_number;
    const phoneNormalized = phoneNumber ? normalizePhone(phoneNumber) : null;
    if (phoneNumber && !phoneNormalized) {
      const error = new Error('El numero de WhatsApp no es valido');
      error.status = 400;
      throw error;
    }

    const apiKey = normalizeOptionalText(input.api_key);
    const webhookSecret = normalizeOptionalText(input.webhook_secret);
    const apiKeyEncrypted = apiKey
      ? encryptSecret(apiKey)
      : null;
    const webhookSecretEncrypted = webhookSecret
      ? encryptSecret(webhookSecret)
      : null;

    const enabled = typeof input.enabled === 'boolean' ? input.enabled : connection.enabled;
    const hasApiKey = Boolean(apiKeyEncrypted || connection.api_key_ciphertext);
    const hasWebhookSecret = Boolean(
      webhookSecretEncrypted
      || connection.webhook_secret_ciphertext
      || process.env.WASENDER_WEBHOOK_SECRET
    );
    if (enabled && (!phoneNormalized || !hasApiKey || !hasWebhookSecret)) {
      const error = new Error('Configura numero, API key y secreto de webhook antes de habilitar la conexion');
      error.status = 400;
      throw error;
    }

    await client.query(
      `UPDATE whatsapp_connections
       SET phone_number = $1,
           phone_normalized = $2,
           external_session_ref = $3,
           enabled = $4,
           connection_status = CASE
             WHEN $4 = FALSE THEN 'disabled'
             WHEN connection_status IN ('unconfigured', 'disabled') THEN 'configured'
             ELSE connection_status
           END,
           api_key_ciphertext = COALESCE($5, api_key_ciphertext),
           api_key_iv = COALESCE($6, api_key_iv),
           api_key_tag = COALESCE($7, api_key_tag),
           webhook_secret_ciphertext = COALESCE($8, webhook_secret_ciphertext),
           webhook_secret_iv = COALESCE($9, webhook_secret_iv),
           webhook_secret_tag = COALESCE($10, webhook_secret_tag),
           updated_at = NOW()
       WHERE id = $11`,
      [
        phoneNumber,
        phoneNormalized,
        Object.prototype.hasOwnProperty.call(input, 'external_session_ref')
          ? normalizeOptionalText(input.external_session_ref)
          : connection.external_session_ref,
        enabled,
        apiKeyEncrypted?.ciphertext || null,
        apiKeyEncrypted?.iv || null,
        apiKeyEncrypted?.tag || null,
        webhookSecretEncrypted?.ciphertext || null,
        webhookSecretEncrypted?.iv || null,
        webhookSecretEncrypted?.tag || null,
        connection.id,
      ]
    );

    const configResult = await client.query(
      'SELECT * FROM agent_configurations WHERE oficina_id = $1 FOR UPDATE',
      [oficinaId]
    );
    const config = configResult.rows[0];
    const agentEnabled = typeof input.agent_enabled === 'boolean'
      ? input.agent_enabled
      : config.agent_enabled;
    if (agentEnabled) {
      if (!enabled) {
        const error = new Error('Habilita primero la conexion de WhatsApp');
        error.status = 400;
        throw error;
      }
      const safetyResult = await client.query(
        `SELECT COUNT(*)::int AS unresolved
           FROM clientes
          WHERE activo = TRUE AND telefono_normalizado IS NULL`
      );
      if (safetyResult.rows[0].unresolved > 0) {
        const error = new Error(
          'No se puede habilitar el agente: hay clientes activos sin telefono normalizado'
        );
        error.status = 409;
        throw error;
      }
    }
    const firstFollowup = Number.parseInt(
      input.first_followup_minutes ?? config.first_followup_minutes,
      10
    );
    const secondFollowup = Number.parseInt(
      input.second_followup_minutes ?? config.second_followup_minutes,
      10
    );
    const cooldown = Number.parseInt(
      input.human_intervention_cooldown_minutes ?? config.human_intervention_cooldown_minutes,
      10
    );
    if (
      !Number.isInteger(cooldown)
      || !Number.isInteger(firstFollowup)
      || !Number.isInteger(secondFollowup)
      || cooldown < 0
      || firstFollowup <= 0
      || secondFollowup <= firstFollowup
    ) {
      const error = new Error('La configuracion de tiempos no es valida');
      error.status = 400;
      throw error;
    }

    await client.query(
      `UPDATE agent_configurations
       SET agent_enabled = $1,
           notification_recipient = $2,
           additional_context = $3,
           timezone = $4,
           human_intervention_cooldown_minutes = $5,
           followup_enabled = $6,
           first_followup_minutes = $7,
           second_followup_minutes = $8,
           appointments_enabled = $9,
           updated_by = $10,
           version = version + 1,
           updated_at = NOW()
       WHERE oficina_id = $11`,
      [
        agentEnabled,
        Object.prototype.hasOwnProperty.call(input, 'notification_recipient')
          ? normalizeOptionalText(input.notification_recipient)
          : config.notification_recipient,
        Object.prototype.hasOwnProperty.call(input, 'additional_context')
          ? normalizeOptionalText(input.additional_context)
          : config.additional_context,
        normalizeOptionalText(input.timezone) || config.timezone,
        cooldown,
        typeof input.followup_enabled === 'boolean' ? input.followup_enabled : config.followup_enabled,
        firstFollowup,
        secondFollowup,
        typeof input.appointments_enabled === 'boolean'
          ? input.appointments_enabled
          : config.appointments_enabled,
        userId,
        oficinaId,
      ]
    );

    return getOfficeSettings(oficinaId, client);
  });
}

async function getConnectionByPublicId(publicId, client = db) {
  const result = await client.query(
    'SELECT * FROM whatsapp_connections WHERE public_id = $1 AND provider = $2',
    [publicId, 'wasender']
  );
  return result.rows[0] || null;
}

async function listOperationalFailures(oficinaId){return(await db.query(`SELECT subsystem,job_id,status,error,updated_at
  FROM operational_failures WHERE oficina_id=$1 ORDER BY updated_at DESC LIMIT 30`,[oficinaId])).rows;}

function decryptConnectionWebhookSecret(connection) {
  if (connection?.webhook_secret_ciphertext) {
    return decryptSecret({
      ciphertext: connection.webhook_secret_ciphertext,
      iv: connection.webhook_secret_iv,
      tag: connection.webhook_secret_tag,
    });
  }
  return process.env.WASENDER_WEBHOOK_SECRET || null;
}

function decryptConnectionApiKey(connection) {
  return decryptSecret({
    ciphertext: connection?.api_key_ciphertext,
    iv: connection?.api_key_iv,
    tag: connection?.api_key_tag,
  });
}

module.exports = {
  ensureOfficeSettings,
  getOfficeSettings,
  updateOfficeSettings,
  getConnectionByPublicId,
  decryptConnectionWebhookSecret,
  decryptConnectionApiKey,
  listOperationalFailures,
};
