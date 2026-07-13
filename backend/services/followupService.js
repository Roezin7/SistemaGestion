const db=require('../db');
const logger=require('../utils/structuredLogger');

async function scheduleAfterAgentMessage(client,messageId,conversationId,oficinaId){
  const config=(await client.query('SELECT * FROM agent_configurations WHERE oficina_id=$1',[oficinaId])).rows[0];
  if(!config?.followup_enabled)return;
  await cancelForConversation(client,conversationId,'superseded_by_new_agent_message');
  const first=Number(config.first_followup_minutes)||120,second=Number(config.second_followup_minutes)||1440;
  await client.query(`INSERT INTO followup_jobs(oficina_id,conversation_id,origin_message_id,stage,due_at)
    VALUES($1,$2,$3,1,NOW()+($4*INTERVAL '1 minute')),($1,$2,$3,2,NOW()+($5*INTERVAL '1 minute')),
    ($1,$2,$3,3,NOW()+(($5+1440)*INTERVAL '1 minute')) ON CONFLICT DO NOTHING`,[oficinaId,conversationId,messageId,first,second]);
}
async function cancelForConversation(client,conversationId,reason='conversation_changed'){
  await client.query(`UPDATE followup_jobs SET status='cancelled',last_error=$2,updated_at=NOW()
    WHERE conversation_id=$1 AND status='pending'`,[conversationId,reason]);
}
async function claim(){return db.withTransaction(async client=>{const row=(await client.query(`SELECT * FROM followup_jobs
  WHERE status='pending' AND due_at<=NOW() ORDER BY due_at,id FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];if(!row)return null;
  return(await client.query("UPDATE followup_jobs SET status='processing',updated_at=NOW() WHERE id=$1 RETURNING *",[row.id])).rows[0];});}
function followupText(stage,preview){if(stage===1)return `Hola, retomo tu consulta${preview?' sobre lo que revisamos':''}. ¿Te ayudo a continuar con tu trámite?`;
  return 'Sigo pendiente por si deseas continuar. Si prefieres que no te contactemos, indícalo y respetaremos tu decisión.';}
async function process(job){return db.withTransaction(async client=>{const c=(await client.query(`SELECT c.*,ac.followup_enabled FROM conversations c
  JOIN agent_configurations ac ON ac.oficina_id=c.oficina_id WHERE c.id=$1 FOR UPDATE`,[job.conversation_id])).rows[0];
  const newerInbound=await client.query("SELECT 1 FROM conversation_messages WHERE conversation_id=$1 AND id>$2 AND direction='inbound' LIMIT 1",[job.conversation_id,job.origin_message_id]);
  const appointment=await client.query("SELECT 1 FROM appointments WHERE conversation_id=$1 AND status='scheduled' LIMIT 1",[job.conversation_id]);
  if(!c||!c.followup_enabled||newerInbound.rows[0]||appointment.rows[0]||c.do_not_contact_at||c.attention_mode!=='automatico'||['llamada_agendada','perdido','pausado'].includes(c.status)){
    await client.query("UPDATE followup_jobs SET status='cancelled',updated_at=NOW() WHERE id=$1",[job.id]);return true;}
  if(job.stage===3){await client.query("UPDATE conversations SET status='perdido',automation_enabled=FALSE,automation_block_reason='followups_exhausted',updated_at=NOW() WHERE id=$1",[c.id]);
    if(c.prospecto_id)await client.query("UPDATE prospectos SET estado='perdido',updated_at=NOW() WHERE id=$1",[c.prospecto_id]);
    await client.query("UPDATE followup_jobs SET status='completed',updated_at=NOW() WHERE id=$1",[job.id]);logger.info('followups_exhausted',{job_id:job.id,conversation_id:c.id});return true;}
  const text=followupText(job.stage,c.last_message_preview),message=(await client.query(`INSERT INTO conversation_messages(oficina_id,conversation_id,connection_id,client_message_id,direction,sender_type,source,message_type,body,status,queued_at,provider_timestamp)
   VALUES($1,$2,$3,$4,'outbound','system','system','text',$5,'pending',NOW(),NOW())RETURNING id`,[c.oficina_id,c.id,c.connection_id,`followup-${job.id}`,text])).rows[0];
  await client.query('INSERT INTO outbound_message_jobs(oficina_id,connection_id,conversation_id,message_id)VALUES($1,$2,$3,$4)',[c.oficina_id,c.connection_id,c.id,message.id]);
  await client.query("UPDATE followup_jobs SET status='sent',outbound_message_id=$2,updated_at=NOW() WHERE id=$1",[job.id,message.id]);logger.info('followup_queued',{job_id:job.id,conversation_id:c.id,stage:job.stage});return true;});}
async function processNext(){const job=await claim();if(!job)return false;try{await process(job);}catch(e){await db.query("UPDATE followup_jobs SET status='failed',last_error=$2,updated_at=NOW() WHERE id=$1",[job.id,String(e.message).slice(0,1000)]);}return true;}
module.exports={scheduleAfterAgentMessage,cancelForConversation,claim,process,processNext,followupText};
