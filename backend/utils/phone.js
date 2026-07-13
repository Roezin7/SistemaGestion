function normalizePhone(value, defaultCountryCode = '52') {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  let text = String(value).trim();
  if (!text) {
    return null;
  }

  text = text.split('@')[0];
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (defaultCountryCode === '52' && digits.length === 13 && digits.startsWith('521')) {
    digits = `52${digits.slice(3)}`;
  }

  if (digits.length === 10 && defaultCountryCode) {
    digits = `${defaultCountryCode}${digits}`;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

function extractAdCodes(text) {
  const matches = String(text || '').toUpperCase().match(
    /\bCB-[A-Z0-9]+(?:-[A-Z0-9]+){0,6}\b(?!-[A-Z0-9])/g
  );
  return Array.from(new Set(matches || []));
}

module.exports = {
  normalizePhone,
  extractAdCodes,
};
