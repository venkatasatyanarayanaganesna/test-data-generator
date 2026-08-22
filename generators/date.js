const { faker } = require('@faker-js/faker');

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function generate(field) {
  const min = field.min || '2020-01-01';
  const max = field.max || '2030-12-31';

  const valid = [
    toISODate(faker.date.between({ from: min, to: max })),
    toISODate(faker.date.between({ from: min, to: max })),
  ];

  const boundary = [
    addDays(min, -1), // one day before min (invalid)
    min, // exactly min (valid)
    addDays(min, 1), // one day after min (valid)
    addDays(max, -1), // one day before max (valid)
    max, // exactly max (valid)
    addDays(max, 1), // one day after max (invalid)
  ];

  const invalid = [
    '',
    null,
    undefined,
    '2026-02-30', // Feb 30 doesn't exist
    '2026-13-01', // month 13
    'not-a-date',
    '31/12/2026', // wrong format (assuming ISO expected)
    12345,
  ];

  const malicious = [
    '<script>alert(1)</script>',
    "' OR '1'='1",
    '0000-00-00',
    '9999-12-31', // far-future edge that sometimes breaks date libraries
    '1970-01-01', // unix epoch, sometimes mishandled as "unset"
  ];

  return { valid, boundary, invalid, malicious };
}

module.exports = { generate };
