function requiredFields(body, fields) {
  return fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanText(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

module.exports = { requiredFields, isValidEmail, cleanText };
