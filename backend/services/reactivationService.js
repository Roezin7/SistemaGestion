const db=require('../db');
const logger=require('../utils/structuredLogger');

async function listCampaigns(oficinaId){return(await db.query(`SELECT c.*,
  (SELECT count(*)::int FROM reactivation_recipients r WHERE r.campaign_id=c.id) AS recipients,
  (SELECT count(*)::int FROM reactivation_recipients r WHERE r.campaign_id=c.id AND r.status='sent') AS sent
  FROM reactivation_campaigns c WHERE oficina_id=$1 ORDER BY scheduled_at DESC`,[oficinaId])).rows;}
async function createCampaign(oficinaId,userId,input){const when=new Date(input.scheduled_at);if(!String(input.name||'').trim()||!String(input.message_context||'').trim()||Number.isNaN(when.getTime())){const e=new Error('Nombre, mensaje y programación son obligatorios');e.status=400;throw e;}
 return db.withTransaction(async client=>{if(input.promotion_id){const promotion=await client.query(`SELECT 1 FROM promotions p WHERE p.id=$1 AND p.active=TRUE
  AND (NOT EXISTS(SELECT 1 FROM promotion_offices x WHERE x.promotion_id=p.id) OR EXISTS(SELECT 1 FROM promotion_offices x WHERE x.promotion_id=p.id AND x.oficina_id=$2))`,[input.promotion_id,oficinaId]);if(!promotion.rows[0]){const e=new Error('La promoción no está disponible para esta oficina');e.status=400;throw e;}}
 const c=(await client.query(`INSERT INTO reactivation_campaigns(oficina_id,name,promotion_id,message_context,criteria,scheduled_at,automatic_enabled,created_by)
 VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8)RETURNING *`,[oficinaId,String(input.name).trim(),input.promotion_id||null,String(input.message_context).trim().slice(0,4000),JSON.stringify(input.criteria||{}),when,input.automatic_enabled===true,userId])).rows[0];
 const ids=Array.from(new Set((input.conversation_ids||[]).map(Number).filter(Number.isInteger))).slice(0,500);if(ids.length)await client.query(`INSERT INTO reactivation_recipients(campaign_id,oficina_id,conversation_id)
 SELECT $1,$2,id FROM conversations WHERE oficina_id=$2 AND id=ANY($3::bigint[]) AND source_type='meta_ad' ON CONFLICT DO NOTHING`,[c.id,oficinaId,ids]);return c;});}
async function prepareDue(){return db.withTransaction(async client=>{const c=(await client.query(`SELECT * FROM reactivation_campaigns WHERE status='scheduled' AND scheduled_at<=NOW()
 ORDER BY scheduled_at,id FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];if(!c)return false;
 if(c.automatic_enabled){const days=Math.max(1,Number(c.criteria?.inactivity_days)||30),service=c.criteria?.service_code||null,strength=c.criteria?.lead_strength||null,max=Math.min(500,Math.max(1,Number(c.criteria?.max_recipients)||100));
  await client.query(`INSERT INTO reactivation_recipients(campaign_id,oficina_id,conversation_id)
   SELECT $1,$2,x.id FROM conversations x WHERE x.oficina_id=$2 AND x.source_type='meta_ad'
   AND x.attention_mode='automatico' AND x.do_not_contact_at IS NULL AND x.last_message_at<NOW()-($3*INTERVAL '1 day')
   AND ($4::text IS NULL OR EXISTS(SELECT 1 FROM lead_evaluations l WHERE l.conversation_id=x.id AND l.service_code=$4))
   AND ($5::text IS NULL OR EXISTS(SELECT 1 FROM lead_evaluations l WHERE l.conversation_id=x.id AND l.strength=$5))
   ORDER BY x.last_message_at LIMIT $6 ON CONFLICT DO NOTHING`,[c.id,c.oficina_id,days,service,strength,max]);}
 await client.query("UPDATE reactivation_campaigns SET status='running',updated_at=NOW() WHERE id=$1",[c.id]);return true;});}
async function claimRecipient(){return db.withTransaction(async client=>{const r=(await client.query(`SELECT r.*,c.message_context,c.promotion_id FROM reactivation_recipients r
 JOIN reactivation_campaigns c ON c.id=r.campaign_id WHERE r.status='pending' AND c.status='running'
 ORDER BY r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`)).rows[0];if(!r)return null;await client.query("UPDATE reactivation_recipients SET status='processing',updated_at=NOW() WHERE id=$1",[r.id]);return r;});}
async function processRecipient(r){return db.withTransaction(async client=>{const c=(await client.query('SELECT * FROM conversations WHERE id=$1 AND oficina_id=$2 FOR UPDATE',[r.conversation_id,r.oficina_id])).rows[0];
 await client.query('SELECT pg_advisory_xact_lock($1,$2)',[98428,Number(r.oficina_id)]);
 let reason=null;if(!c||c.source_type!=='meta_ad')reason='not_ad_origin';else if(c.do_not_contact_at)reason='do_not_contact';else if(c.attention_mode!=='automatico')reason='human_or_paused';
 else if((await client.query('SELECT 1 FROM clientes WHERE activo=TRUE AND telefono_normalizado=$1 LIMIT 1',[c.phone_normalized])).rows[0])reason='active_client';
 else if((await client.query("SELECT 1 FROM appointments WHERE conversation_id=$1 AND status='scheduled' LIMIT 1",[c.id])).rows[0])reason='appointment';
 else if((await client.query(`SELECT 1 FROM reactivation_recipients old WHERE old.conversation_id=$1 AND old.status='sent'
   AND old.sent_at>NOW()-INTERVAL '30 days' LIMIT 1`,[c.id])).rows[0])reason='frequency_limit';
 else if(Number((await client.query(`SELECT count(*) FROM reactivation_recipients WHERE oficina_id=$1 AND status IN('queued','sent') AND updated_at>=date_trunc('day',NOW())`,[r.oficina_id])).rows[0].count)>=(Number(process.env.REACTIVATION_DAILY_OFFICE_LIMIT)||200))reason='daily_office_limit';
 if(reason){await client.query("UPDATE reactivation_recipients SET status='skipped',skip_reason=$2,updated_at=NOW() WHERE id=$1",[r.id,reason]);return true;}
 const promotion=r.promotion_id?(await client.query('SELECT commercial_text,terms FROM promotions WHERE id=$1 AND active=TRUE AND starts_at<=NOW() AND(ends_at IS NULL OR ends_at>NOW())',[r.promotion_id])).rows[0]:null;
 const text=`${r.message_context}${promotion?.commercial_text?`\n\n${promotion.commercial_text}`:''}`.slice(0,4000);
 const m=(await client.query(`INSERT INTO conversation_messages(oficina_id,conversation_id,connection_id,client_message_id,direction,sender_type,source,message_type,body,status,queued_at,provider_timestamp)
 VALUES($1,$2,$3,$4,'outbound','system','system','text',$5,'pending',NOW(),NOW())RETURNING id`,[c.oficina_id,c.id,c.connection_id,`reactivation-${r.id}`,text])).rows[0];
 await client.query('INSERT INTO outbound_message_jobs(oficina_id,connection_id,conversation_id,message_id)VALUES($1,$2,$3,$4)',[c.oficina_id,c.connection_id,c.id,m.id]);
 await client.query("UPDATE reactivation_recipients SET status='queued',message_id=$2,updated_at=NOW() WHERE id=$1",[r.id,m.id]);logger.info('reactivation_queued',{recipient_id:r.id,campaign_id:r.campaign_id,conversation_id:c.id});return true;});}
async function finalizeCampaigns(){await db.query(`UPDATE reactivation_campaigns c SET status='completed',updated_at=NOW() WHERE status='running'
 AND NOT EXISTS(SELECT 1 FROM reactivation_recipients r WHERE r.campaign_id=c.id AND r.status IN('pending','processing','queued'))`);}
async function processNext(){await prepareDue();const r=await claimRecipient();if(!r){await finalizeCampaigns();return false;}try{await processRecipient(r);}catch(e){await db.query("UPDATE reactivation_recipients SET status='failed',last_error=$2,updated_at=NOW() WHERE id=$1",[r.id,String(e.message).slice(0,1000)]);}return true;}
async function cancelQueued(client,conversationId,reason){const jobs=await client.query(`UPDATE outbound_message_jobs j SET status='failed',last_error=$2,updated_at=NOW()
 WHERE j.status='pending' AND EXISTS(SELECT 1 FROM reactivation_recipients r WHERE r.message_id=j.message_id AND r.conversation_id=$1 AND r.status='queued') RETURNING message_id`,[conversationId,reason]);
 if(jobs.rows.length)await client.query("UPDATE conversation_messages SET status='failed',error_message=$2,failed_at=NOW(),updated_at=NOW() WHERE id=ANY($1::bigint[])",[jobs.rows.map(x=>x.message_id),reason]);
 await client.query("UPDATE reactivation_recipients SET status='cancelled',skip_reason=$2,updated_at=NOW() WHERE conversation_id=$1 AND status IN('pending','processing','queued')",[conversationId,reason]);}
module.exports={listCampaigns,createCampaign,prepareDue,claimRecipient,processRecipient,finalizeCampaigns,processNext,cancelQueued};
