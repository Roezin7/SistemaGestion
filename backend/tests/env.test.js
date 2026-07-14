const test=require('node:test');
const assert=require('node:assert/strict');
const {isEnabled}=require('../utils/env');

test('interpreta interruptores booleanos comunes de Coolify',()=>{
  for(const value of ['true','TRUE',' True ','"true"',"'true'",'1','yes','on'])assert.equal(isEnabled(value),true);
  for(const value of [undefined,'','false','0','off','no'])assert.equal(isEnabled(value),false);
});
