const { faker } = require('@faker-js/faker');

// Canonical, widely-used input-validation test payloads. These are the
// same strings QA/security teams use to check that a field properly
// escapes/rejects hostile input — not exploit code, just probe strings.
const MALICIOUS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  '${7*7}',
  '{{7*7}}',
  '../../../../etc/passwd',
  'NULL',
  '\u0000',
  'A'.repeat(10000),
];

function randomStringOfLength(len) {
  if (len <= 0) return '';
  return faker.string.alpha({ length: len });
}

function generate(field) {
  const minLength = field.minLength ?? 0;
  const maxLength = field.maxLength ?? 255;

  const valid = [
    faker.lorem.words({ min: 1, max: 3 }).slice(0, maxLength),
    randomStringOfLength(Math.min(Math.max(minLength, 1), maxLength)),
    randomStringOfLength(Math.floor((minLength + maxLength) / 2) || 1),
  ];

  const boundary = [];
  if (minLength > 0) {
    boundary.push(randomStringOfLength(minLength - 1)); // just under min (invalid)
    boundary.push(randomStringOfLength(minLength)); // exactly min (valid)
    boundary.push(randomStringOfLength(minLength + 1)); // just over min (valid)
  }
  boundary.push(randomStringOfLength(maxLength - 1)); // just under max (valid)
  boundary.push(randomStringOfLength(maxLength)); // exactly max (valid)
  boundary.push(randomStringOfLength(maxLength + 1)); // just over max (invalid)

  const invalid = [
    '', // empty string
    null,
    undefined,
    12345, // wrong type
    { nested: 'object' }, // wrong type
    ['array'], // wrong type
    ' '.repeat(Math.max(minLength, 1)), // whitespace-only
  ];

  const malicious = [...MALICIOUS_PAYLOADS];

  return { valid, boundary, invalid, malicious };
}

module.exports = { generate, MALICIOUS_PAYLOADS };
