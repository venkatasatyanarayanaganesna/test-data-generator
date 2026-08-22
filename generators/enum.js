function generate(field) {
  const values = field.values || [];

  const valid = [...values];

  // "Boundary" for an enum is the edges of the list itself.
  const boundary = values.length > 0 ? [values[0], values[values.length - 1]] : [];

  const invalid = [
    'not-a-real-value',
    null,
    undefined,
    '',
    ...(values.length > 0 && typeof values[0] === 'string'
      ? [values[0].toUpperCase(), values[0] + ' '] // case/whitespace variants
      : []),
  ];

  const malicious = ['<script>alert(1)</script>', "' OR '1'='1"];

  return { valid, boundary, invalid, malicious };
}

module.exports = { generate };
