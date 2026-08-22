const { faker } = require('@faker-js/faker');

function generate() {
  const valid = [
    faker.internet.email(),
    faker.internet.email(),
    `${faker.internet.username()}+tag@${faker.internet.domainName()}`, // plus-addressing, a common valid-but-tricky case
  ];

  const boundary = [
    'a@b.co', // shortest plausible valid email
    `${'a'.repeat(64)}@example.com`, // local part at RFC 5321's 64-char limit
    `${'a'.repeat(65)}@example.com`, // one over that limit (invalid)
  ];

  const invalid = [
    '',
    null,
    undefined,
    'not-an-email',
    '@missinglocal.com',
    'missingdomain@',
    'two@@at.com',
    'spaces in@email.com',
    'trailing.dot.@example.com',
    'no-tld@example',
  ];

  const malicious = [
    '<script>alert(1)</script>@example.com',
    "'; DROP TABLE users; --@example.com",
    `${'a'.repeat(300)}@example.com`, // extreme length
    'user@[127.0.0.1]', // valid-by-spec but often mishandled IP-literal domain
  ];

  return { valid, boundary, invalid, malicious };
}

module.exports = { generate };
