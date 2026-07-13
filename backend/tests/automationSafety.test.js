const test=require('node:test');
const assert=require('node:assert/strict');
const agent=require('../services/agentOrchestratorService');
const {followupText}=require('../services/followupService');
const logger=require('../utils/structuredLogger');

function context(overrides={}){return{conversation:{agent_enabled:true,connection_enabled:true,attention_mode:'automatico',automation_enabled:true,do_not_contact_at:null,automation_version:4,...overrides}};}
const job={automation_version:4};

test('elegibilidad exige todos los interruptores y la versión vigente',()=>{
  const old=process.env.AGENT_AUTOMATION_ENABLED;process.env.AGENT_AUTOMATION_ENABLED='true';
  try{assert.equal(agent.eligible(job,context()),true);for(const patch of [{agent_enabled:false},{connection_enabled:false},{attention_mode:'humano'},{attention_mode:'pausado'},{automation_enabled:false},{do_not_contact_at:new Date()},{automation_version:5}])assert.equal(agent.eligible(job,context(patch)),false);}finally{if(old===undefined)delete process.env.AGENT_AUTOMATION_ENABLED;else process.env.AGENT_AUTOMATION_ENABLED=old;}
});

test('el contrato estructurado exige transferencia, baja y agenda explícitas',()=>{
  for(const field of ['should_handoff','do_not_contact','should_schedule','schedule_data'])assert.ok(agent.schema.required.includes(field));
  assert.equal(agent.schema.additionalProperties,false);
});

test('rechaza una salida incompleta antes de crear mensajes',()=>{
  assert.throws(()=>agent.validateAgentResult({reply:'texto'}),/inválida/);
  assert.throws(()=>agent.validateAgentResult({reply:'',should_handoff:false,do_not_contact:false,should_schedule:true,schedule_data:null,lead_strength:'medio',rationale:'x',summary:'x',collected_data:{}}),/agenda/);
});

test('acepta una decisión segura completa',()=>{
  assert.equal(agent.validateAgentResult({reply:'Te ayudo.',should_handoff:false,do_not_contact:false,should_schedule:false,schedule_data:null,lead_strength:'medio',rationale:'Consulta válida',summary:'Solicita información',collected_data:{}}),true);
});

test('las instrucciones prohíben inventar, descontar pagos oficiales y revelar costos internos',()=>{
  const text=agent.buildInstructions({},{});
  assert.match(text,/nunca inventes/i);assert.match(text,/pagos oficiales/i);assert.match(text,/costo interno/i);assert.match(text,/no contacto/i);
});

test('solo existen dos seguimientos comerciales y el tercero es cierre interno',()=>{
  assert.match(followupText(1,''),/retomo/i);assert.match(followupText(2,''),/no te contactemos/i);
});

test('el logger censura secretos y limita textos extensos',()=>{
  const safe=logger.sanitize({apiKey:'real',authorization:'Bearer real',body:'x'.repeat(3000)});
  assert.equal(safe.apiKey,'[REDACTED]');assert.equal(safe.authorization,'[REDACTED]');assert.match(safe.body,/truncated/);
});
