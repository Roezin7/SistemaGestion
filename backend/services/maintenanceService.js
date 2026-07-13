const db=require('../db');
const logger=require('../utils/structuredLogger');

async function cleanup(){
  const days=Math.max(7,Number(process.env.WEBHOOK_PAYLOAD_RETENTION_DAYS)||30);
  return db.withTransaction(async client=>{
    const lock=await client.query('SELECT pg_try_advisory_xact_lock($1) AS acquired',[98427]);
    if(!lock.rows[0].acquired)return false;
    const result=await client.query(`UPDATE webhook_events SET payload='{}'::jsonb,updated_at=NOW()
      WHERE status IN ('processed','ignored','failed') AND received_at<NOW()-($1*INTERVAL '1 day') AND payload<>'{}'::jsonb`,[days]);
    if(result.rowCount)logger.info('webhook_payloads_pruned',{count:result.rowCount,retention_days:days});
    return true;
  });
}
module.exports={cleanup};
