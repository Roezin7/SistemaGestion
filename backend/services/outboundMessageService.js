const db = require('../db');
const { WasenderClient } = require('../integrations/wasender/WasenderClient');
const { decryptConnectionApiKey } = require('./whatsappSettingsService');
const logger = require('../utils/structuredLogger');
const followupService = require('./followupService');

const MAX_ATTEMPTS = 5;

async function claimNextJob() {
  return db.withTransaction(async (client) => {
    const result = await client.query(
      `SELECT j.*, m.body, m.sender_type, c.phone_normalized, wc.api_key_ciphertext, wc.api_key_iv,
              wc.api_key_tag, wc.enabled AS connection_enabled
         FROM outbound_message_jobs j
         INNER JOIN conversation_messages m ON m.id = j.message_id
         INNER JOIN conversations c ON c.id = j.conversation_id
         INNER JOIN whatsapp_connections wc ON wc.id = j.connection_id
        WHERE j.attempts < $1 AND j.next_attempt_at <= NOW()
          AND (j.status = 'pending' OR
               (j.status = 'processing' AND j.processing_started_at < NOW() - INTERVAL '5 minutes'))
        ORDER BY j.next_attempt_at, j.id
        FOR UPDATE OF j SKIP LOCKED
        LIMIT 1`,
      [MAX_ATTEMPTS]
    );
    if (!result.rows[0]) return null;
    const claimed = await client.query(
      `UPDATE outbound_message_jobs SET status = 'processing', attempts = attempts + 1,
        processing_started_at = NOW(), last_error = NULL, updated_at = NOW()
        WHERE id = $1 RETURNING attempts`,
      [result.rows[0].id]
    );
    return { ...result.rows[0], attempts: claimed.rows[0].attempts };
  });
}

function externalMessageId(response) {
  return response?.data?.key?.id
    || response?.data?.id
    || response?.msgId
    || response?.messageId
    || response?.id
    || null;
}

async function processJob(job, clientFactory = null) {
  try {
    if (!job.connection_enabled) throw new Error('La conexión fue deshabilitada');
    const apiKey = decryptConnectionApiKey(job);
    const provider = clientFactory
      ? clientFactory(apiKey)
      : new WasenderClient({ apiKey });
    const response = await provider.sendText({ to: job.phone_normalized, text: job.body });
    const providerId = externalMessageId(response);

    await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE conversation_messages SET external_message_id = COALESCE($2, external_message_id),
          status = 'sent', sent_at = NOW(), provider_response = $3::jsonb,
          error_message = NULL, updated_at = NOW() WHERE id = $1`,
        [job.message_id, providerId, JSON.stringify(logger.sanitize(response))]
      );
      if (job.sender_type === 'agent') {
        await followupService.scheduleAfterAgentMessage(client, job.message_id, job.conversation_id, job.oficina_id);
      }
      await client.query(
        `UPDATE outbound_message_jobs SET status = 'sent', sent_at = NOW(), last_error = NULL,
          updated_at = NOW() WHERE id = $1`,
        [job.id]
      );
      await client.query(`UPDATE reactivation_recipients SET status='sent',sent_at=NOW(),updated_at=NOW()
        WHERE message_id=$1 AND status='queued'`,[job.message_id]);
    });
    logger.info('outbound_message_sent',{job_id:job.id,message_id:job.message_id,conversation_id:job.conversation_id,sender_type:job.sender_type});
    return true;
  } catch (error) {
    const finalFailure = job.attempts >= MAX_ATTEMPTS;
    const delayMinutes = Math.min(30, 2 ** Math.max(0, job.attempts - 1));
    await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE outbound_message_jobs SET status = $2::varchar, last_error = $3,
          next_attempt_at = NOW() + ($4 * INTERVAL '1 minute'), updated_at = NOW()
          WHERE id = $1`,
        [job.id, finalFailure ? 'failed' : 'pending', String(error.message).slice(0, 1000), delayMinutes]
      );
      await client.query(
        `UPDATE conversation_messages SET status = $2::varchar,
          failed_at = CASE WHEN $2::varchar = 'failed' THEN NOW() ELSE failed_at END,
          error_message = $3, updated_at = NOW() WHERE id = $1`,
        [job.message_id, finalFailure ? 'failed' : 'pending', String(error.message).slice(0, 1000)]
      );
      if(finalFailure)await client.query("UPDATE reactivation_recipients SET status='failed',last_error=$2,updated_at=NOW() WHERE message_id=$1",[job.message_id,String(error.message).slice(0,1000)]);
    });
    logger.error('outbound_message_failed', {
      job_id: job.id,
      attempt: job.attempts,
      final_failure: finalFailure,
      error: error.message,
    });
    return false;
  }
}

async function processNextJob(clientFactory) {
  const job = await claimNextJob();
  if (!job) return false;
  await processJob(job, clientFactory);
  return true;
}

async function claimNextNotification() {
  return db.withTransaction(async (client) => {
    const result=await client.query(`SELECT n.*,wc.api_key_ciphertext,wc.api_key_iv,wc.api_key_tag,wc.enabled AS connection_enabled
      FROM notification_jobs n JOIN whatsapp_connections wc ON wc.id=n.connection_id
      WHERE n.attempts<$1 AND n.next_attempt_at<=NOW() AND (n.status='pending' OR
      (n.status='processing' AND n.processing_started_at<NOW()-INTERVAL '5 minutes'))
      ORDER BY n.next_attempt_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1`,[MAX_ATTEMPTS]);
    if(!result.rows[0])return null;
    const updated=await client.query(`UPDATE notification_jobs SET status='processing',attempts=attempts+1,
      processing_started_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=$1 RETURNING attempts`,[result.rows[0].id]);
    return{...result.rows[0],attempts:updated.rows[0].attempts};
  });
}
async function processNotification(job,clientFactory=null){try{if(!job.connection_enabled)throw new Error('La conexión fue deshabilitada');
  const apiKey=decryptConnectionApiKey(job),provider=clientFactory?clientFactory(apiKey):new WasenderClient({apiKey});
  await provider.sendText({to:job.recipient,text:job.body});await db.query("UPDATE notification_jobs SET status='sent',sent_at=NOW(),updated_at=NOW() WHERE id=$1",[job.id]);return true;
}catch(error){const final=job.attempts>=MAX_ATTEMPTS;await db.query(`UPDATE notification_jobs SET status=$2::varchar,last_error=$3,
  next_attempt_at=NOW()+($4*INTERVAL '1 minute'),updated_at=NOW() WHERE id=$1`,[job.id,final?'failed':'pending',String(error.message).slice(0,1000),Math.min(30,2**job.attempts)]);return false;}}
async function processNextNotification(clientFactory){const job=await claimNextNotification();if(!job)return false;await processNotification(job,clientFactory);return true;}

module.exports = { claimNextJob, processJob, processNextJob, externalMessageId,
  claimNextNotification,processNotification,processNextNotification };
