function isEnabled(value) {
  const normalized=String(value??'').trim().replace(/^(['"])(.*)\1$/,'$2').trim().toLowerCase();
  return ['true','1','yes','on'].includes(normalized);
}

function envEnabled(name){return isEnabled(process.env[name]);}

module.exports={isEnabled,envEnabled};
