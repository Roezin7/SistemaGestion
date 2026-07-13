const test=require('node:test');
const assert=require('node:assert/strict');
const { OpenAIResponsesClient }=require('../integrations/openai/OpenAIResponsesClient');

test('envía Responses API con salida JSON estricta y la interpreta',async()=>{
  let request;
  const client=new OpenAIResponsesClient({apiKey:'test',model:'model-test',fetchImpl:async(url,options)=>{
    request={url,options,body:JSON.parse(options.body)};
    return{ok:true,json:async()=>({id:'resp-1',model:'model-test',output:[{content:[{type:'output_text',text:'{"reply":"hola"}'}]}],usage:{input_tokens:10}})};
  }});
  const result=await client.generateStructured({instructions:'reglas',input:'entrada',schema:{type:'object'},schemaName:'test'});
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.body.text.format.type,'json_schema');
  assert.equal(request.body.text.format.strict,true);
  assert.deepEqual(result.data,{reply:'hola'});
});

test('no incluye la API key dentro del cuerpo',async()=>{
  let body;
  const client=new OpenAIResponsesClient({apiKey:'super-secreta',fetchImpl:async(_url,options)=>{body=options.body;return{ok:true,json:async()=>({output_text:'{}'})};}});
  await client.generateStructured({instructions:'x',input:'y',schema:{type:'object'}});
  assert.equal(body.includes('super-secreta'),false);
});
