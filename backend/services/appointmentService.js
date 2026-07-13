const db=require('../db');
const logger=require('../utils/structuredLogger');

function localParts(date,timeZone){const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
function minutes(value){const [h,m]=String(value).split(':').map(Number);return h*60+m;}

async function getSettings(oficinaId){
  await db.query(`INSERT INTO appointment_settings(oficina_id)VALUES($1)ON CONFLICT DO NOTHING`,[oficinaId]);
  return (await db.query('SELECT * FROM appointment_settings WHERE oficina_id=$1',[oficinaId])).rows[0];
}
async function updateSettings(oficinaId,userId,input){const current=await getSettings(oficinaId);
  const start=input.weekday_start||current.weekday_start,end=input.weekday_end||current.weekday_end;
  const slot=Number(input.slot_minutes)||current.slot_minutes,duration=Number(input.default_duration_minutes)||current.default_duration_minutes;
  const timezone=input.timezone||current.timezone;
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone}).format(new Date());}catch{const e=new Error('Zona horaria inválida');e.status=400;throw e;}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||minutes(start)>=minutes(end)||slot<5||slot>120||duration<5||duration>240){const e=new Error('Configuración de agenda inválida');e.status=400;throw e;}
  if(input.primary_advisor_id){const advisor=await db.query(`SELECT 1 FROM usuarios u JOIN usuario_oficinas uo ON uo.usuario_id=u.id
    WHERE u.id=$1 AND uo.oficina_id=$2`,[input.primary_advisor_id,oficinaId]);if(!advisor.rows[0]){const e=new Error('El asesor no pertenece a la oficina activa');e.status=400;throw e;}}
  const result=await db.query(
  `UPDATE appointment_settings SET primary_advisor_id=$2,weekday_start=$3,weekday_end=$4,slot_minutes=$5,
   default_duration_minutes=$6,timezone=$7,allow_same_day=$8,updated_by=$9,updated_at=NOW()
   WHERE oficina_id=$1 RETURNING *`,[oficinaId,input.primary_advisor_id||null,start,end,slot,duration,timezone,
   typeof input.allow_same_day==='boolean'?input.allow_same_day:current.allow_same_day,userId]);return result.rows[0];}

async function listAppointments(oficinaId,from,to){const result=await db.query(
  `SELECT a.*,c.display_name,c.phone_normalized,p.nombre AS prospecto_nombre,u.nombre AS advisor_name
   FROM appointments a JOIN conversations c ON c.id=a.conversation_id
   LEFT JOIN prospectos p ON p.id=a.prospecto_id LEFT JOIN usuarios u ON u.id=a.advisor_id
   WHERE a.oficina_id=$1 AND a.scheduled_at>=COALESCE($2::timestamptz,NOW()-INTERVAL '30 days')
   AND a.scheduled_at<COALESCE($3::timestamptz,NOW()+INTERVAL '90 days') ORDER BY a.scheduled_at`,[oficinaId,from||null,to||null]);return result.rows;}
async function listAdvisors(oficinaId){return(await db.query(`SELECT u.id,u.nombre FROM usuarios u JOIN usuario_oficinas uo ON uo.usuario_id=u.id
  WHERE uo.oficina_id=$1 ORDER BY u.nombre`,[oficinaId])).rows;}

async function createAppointment(oficinaId,userId,conversationId,input){
  const scheduledAt=new Date(input.scheduled_at);const duration=Number(input.duration_minutes)||15;
  if(Number.isNaN(scheduledAt.getTime())||scheduledAt<=new Date()||!['phone_call','whatsapp_call'].includes(input.modality)||duration<5||duration>240){const e=new Error('Datos de cita inválidos');e.status=400;throw e;}
  return db.withTransaction(async client=>{
    await client.query('SELECT pg_advisory_xact_lock($1,$2)',[98421,Number(oficinaId)]);
    const settings=(await client.query('SELECT * FROM appointment_settings WHERE oficina_id=$1',[oficinaId])).rows[0]||{weekday_start:'10:00',weekday_end:'17:00',timezone:'America/Mexico_City',primary_advisor_id:null};
    const c=(await client.query(`SELECT c.*,wc.enabled AS connection_enabled,ac.notification_recipient
      FROM conversations c JOIN whatsapp_connections wc ON wc.id=c.connection_id
      JOIN agent_configurations ac ON ac.oficina_id=c.oficina_id WHERE c.id=$1 AND c.oficina_id=$2 FOR UPDATE OF c`,[conversationId,oficinaId])).rows[0];
    if(!c){return null;} if(c.do_not_contact_at){const e=new Error('La conversación está marcada como no contactar');e.status=409;throw e;}
    const overlap=await client.query(`SELECT 1 FROM appointments WHERE oficina_id=$1 AND status='scheduled'
      AND scheduled_at < $2::timestamptz+($3*INTERVAL '1 minute')
      AND scheduled_at+(duration_minutes*INTERVAL '1 minute') > $2::timestamptz LIMIT 1`,[oficinaId,scheduledAt,duration]);
    if(overlap.rows[0]){const e=new Error('El horario se cruza con otra cita');e.status=409;throw e;}
    const parts=localParts(scheduledAt,settings.timezone);const minute=Number(parts.hour)*60+Number(parts.minute);
    const dateKey=(date)=>new Intl.DateTimeFormat('en-CA',{timeZone:settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    if(settings.allow_same_day===false&&dateKey(scheduledAt)===dateKey(new Date())){const e=new Error('La oficina no permite citas el mismo día');e.status=400;throw e;}
    if(minute%(Number(settings.slot_minutes)||15)!==0){const e=new Error(`La hora debe respetar bloques de ${settings.slot_minutes||15} minutos`);e.status=400;throw e;}
    const extraordinary=['Sat','Sun'].includes(parts.weekday)||minute<minutes(settings.weekday_start)||minute>=minutes(settings.weekday_end);
    let summary=(await client.query('SELECT * FROM conversation_summaries WHERE conversation_id=$1',[c.id])).rows[0];
    if(!summary){const recent=await client.query('SELECT direction,body FROM conversation_messages WHERE conversation_id=$1 AND body IS NOT NULL ORDER BY id DESC LIMIT 10',[c.id]);
      summary={summary:recent.rows.reverse().map(m=>`${m.direction==='inbound'?'Prospecto':'Asesor'}: ${m.body}`).join(' | ').slice(0,2000),collected_data:{}};}
    const evaluation=(await client.query('SELECT * FROM lead_evaluations WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 1',[c.id])).rows[0];
    const appointment=(await client.query(`INSERT INTO appointments(oficina_id,conversation_id,prospecto_id,advisor_id,scheduled_at,
      duration_minutes,modality,extraordinary,notes,summary_snapshot,collected_data_snapshot,lead_strength_snapshot,service_code_snapshot,promotion_snapshot,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14::jsonb,$15)RETURNING *`,[oficinaId,c.id,c.prospecto_id,settings.primary_advisor_id,scheduledAt,duration,input.modality,extraordinary,input.notes||null,
      summary?.summary||null,JSON.stringify(summary?.collected_data||{}),evaluation?.strength||null,evaluation?.service_code||null,
      JSON.stringify(summary?.collected_data?.promotion_mentioned||null),userId])).rows[0];
    await client.query(`UPDATE conversations SET status='llamada_agendada',attention_mode='humano',automation_enabled=FALSE,
      automation_block_reason='appointment_scheduled',automation_version=automation_version+1,human_intervened_at=COALESCE(human_intervened_at,NOW()),updated_at=NOW() WHERE id=$1`,[c.id]);
    if(c.prospecto_id)await client.query("UPDATE prospectos SET estado='llamada_agendada',fecha_proximo_seguimiento=NULL,updated_at=NOW() WHERE id=$1 AND oficina_id=$2",[c.prospecto_id,oficinaId]);
    const when=new Intl.DateTimeFormat('es-MX',{dateStyle:'full',timeStyle:'short',timeZone:settings.timezone}).format(scheduledAt);
    const confirmation=`Tu llamada quedó agendada para ${when}. Modalidad: ${input.modality==='whatsapp_call'?'llamada por WhatsApp':'llamada telefónica'}.`;
    const message=(await client.query(`INSERT INTO conversation_messages(oficina_id,conversation_id,connection_id,client_message_id,direction,sender_type,source,message_type,body,status,queued_at,provider_timestamp,created_by)
      VALUES($1,$2,$3,$4,'outbound','system','system','text',$5,'pending',NOW(),NOW(),$6)RETURNING id`,[oficinaId,c.id,c.connection_id,`appointment-${appointment.id}`,confirmation,userId])).rows[0];
    await client.query('INSERT INTO outbound_message_jobs(oficina_id,connection_id,conversation_id,message_id)VALUES($1,$2,$3,$4)',[oficinaId,c.connection_id,c.id,message.id]);
    if(c.notification_recipient){const notice=`NUEVA LLAMADA AGENDADA\nProspecto: ${c.display_name||'Sin nombre'}\nTeléfono: ${c.phone_normalized}\nHorario: ${when}\nModalidad: ${input.modality==='whatsapp_call'?'WhatsApp':'Teléfono'}\nHorario extraordinario: ${extraordinary?'Sí':'No'}\nPerfil: ${evaluation?.strength||'Sin evaluar'}\nResumen: ${summary?.summary||'Sin resumen'}`;
      await client.query('INSERT INTO notification_jobs(oficina_id,connection_id,appointment_id,recipient,body)VALUES($1,$2,$3,$4,$5)',[oficinaId,c.connection_id,appointment.id,c.notification_recipient,notice]);}
    logger.info('appointment_created',{appointment_id:appointment.id,conversation_id:c.id,oficina_id:oficinaId,extraordinary,modality:input.modality});
    return appointment;
  });
}
module.exports={getSettings,updateSettings,listAppointments,listAdvisors,createAppointment,localParts};
