const { faker } = require('@faker-js/faker');

function generate(field) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const isInteger = field.integer !== false; // default to integer

  const randomInRange = () =>
    isInteger
      ? faker.number.int({ min, max })
      : faker.number.float({ min, max, fractionDigits: 2 });

  const valid = [randomInRange(), randomInRange(), min, max];

  const boundary = [
    min - 1, // just under min (invalid)
    min, // exactly min (valid)
    min + 1, // just over min (valid)
    max - 1, // just under max (valid)
    max, // exactly max (valid)
    max + 1, // just over max (invalid)
  ];

  const invalid = [
    'not a number',
    null,
    undefined,
    NaN,
    Infinity,
    -Infinity,
    isInteger ? min + 0.5 : undefined, // a float when an integer is required
    [],
    {},
  ].filter((v) => v !== undefined);

  const malicious = [
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    -0,
    1e308, // near float overflow
    '1e999', // string that parses to Infinity
  ];

  return { valid, boundary, invalid, malicious };
}

module.exports = { generate };
