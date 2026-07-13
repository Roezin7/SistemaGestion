const service = require('../services/agentOrchestratorService');
const logger = require('../utils/structuredLogger');
const INTERVAL_MS=Math.max(500,Number(process.env.AGENT_WORKER_INTERVAL_MS)||1500);
let timer=null,running=false,lastError=null;
async function tick(){if(running)return;running=true;try{for(let i=0;i<5;i+=1){if(!await service.processNextJob())break;}lastError=null;}catch(e){lastError=e.message;logger.error('agent_worker_failed',{error:e.message});}finally{running=false;}}
function start(){if(timer||process.env.AGENT_WORKER_ENABLED==='false')return;timer=setInterval(tick,INTERVAL_MS);timer.unref();void tick();}
function stop(){if(timer)clearInterval(timer);timer=null;}
function getStatus(){return{enabled:process.env.AGENT_WORKER_ENABLED!=='false',running,last_error:lastError};}
module.exports={start,stop,tick,getStatus};
