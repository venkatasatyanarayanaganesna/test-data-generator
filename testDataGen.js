const fs = require('fs');
const path = require('path');

const stringGen = require('./generators/string');
const numberGen = require('./generators/number');
const emailGen = require('./generators/email');
const booleanGen = require('./generators/boolean');
const dateGen = require('./generators/date');
const enumGen = require('./generators/enum');

const OUTPUT_DIR = path.join(__dirname, 'output');

const GENERATORS = {
  string: stringGen,
  number: numberGen,
  email: emailGen,
  boolean: booleanGen,
  date: dateGen,
  enum: enumGen,
};

// ---------- CLI arg parsing ----------

function parseArgs(argv = process.argv.slice(2)) {
  const schemaIdx = argv.indexOf('--schema');
  const nameIdx = argv.indexOf('--name');
  const formatIdx = argv.indexOf('--format');
  const recordsIdx = argv.indexOf('--records');

  if (schemaIdx === -1 || !argv[schemaIdx + 1]) {
    throw new Error(
      'Usage:\n' +
      '  node testDataGen.js --schema schema.json [--name my-form] [--format json|csv|both] [--records 5]'
    );
  }

  const schemaPath = argv[schemaIdx + 1];
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const baseName = nameIdx !== -1 && argv[nameIdx + 1] ? argv[nameIdx + 1] : (schema.name || 'testdata');
  const format = formatIdx !== -1 && argv[formatIdx + 1] ? argv[formatIdx + 1] : 'both';
  const recordCount = recordsIdx !== -1 && argv[recordsIdx + 1] ? parseInt(argv[recordsIdx + 1], 10) : 5;

  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    throw new Error('Schema must have a non-empty "fields" array.');
  }

  return { schema, baseName, format, recordCount };
}

// ---------- Validation ----------

function validateSchema(schema) {
  const errors = [];
  schema.fields.forEach((field, i) => {
    if (!field.name) errors.push(`fields[${i}] is missing "name"`);
    if (!field.type) errors.push(`fields[${i}] is missing "type"`);
    if (field.type && !GENERATORS[field.type]) {
      errors.push(
        `fields[${i}] has unsupported type "${field.type}" ` +
        `(supported: ${Object.keys(GENERATORS).join(', ')})`
      );
    }
    if (field.type === 'enum' && (!Array.isArray(field.values) || field.values.length === 0)) {
      errors.push(`fields[${i}] ("${field.name}") is type "enum" but has no "values" array`);
    }
  });
  if (errors.length > 0) {
    throw new Error(`Schema validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}

// ---------- Generation ----------

function generateFieldData(field) {
  const generator = GENERATORS[field.type];
  return generator.generate(field);
}

function generateAllFields(schema) {
  const result = {};
  for (const field of schema.fields) {
    result[field.name] = generateFieldData(field);
  }
  return result;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildHappyPathRecords(schema, fieldData, count) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const record = {};
    for (const field of schema.fields) {
      const valid = fieldData[field.name].valid;
      record[field.name] = valid.length > 0 ? pickRandom(valid) : null;
    }
    records.push(record);
  }
  return records;
}

// ---------- Output ----------

function writeJson(fieldData, records, baseName, outputDir = OUTPUT_DIR) {
  fs.mkdirSync(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${baseName}.testdata.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ fields: fieldData, sampleRecords: records }, null, 2)
  );
  return outPath;
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(fieldData, baseName, outputDir = OUTPUT_DIR) {
  const rows = [['field', 'category', 'value']];
  for (const [fieldName, categories] of Object.entries(fieldData)) {
    for (const [category, values] of Object.entries(categories)) {
      for (const value of values) {
        rows.push([fieldName, category, csvEscape(value)]);
      }
    }
  }
  const csvContent = rows.map((r) => r.join(',')).join('\n');

  fs.mkdirSync(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${baseName}.testdata.csv`);
  fs.writeFileSync(outPath, csvContent);
  return outPath;
}

// ---------- Main ----------

function main() {
  const { schema, baseName, format, recordCount } = parseArgs();
  validateSchema(schema);

  console.log(`Generating test data for "${baseName}" (${schema.fields.length} fields)...\n`);

  const fieldData = generateAllFields(schema);
  const records = buildHappyPathRecords(schema, fieldData, recordCount);

  for (const field of schema.fields) {
    const d = fieldData[field.name];
    console.log(
      `  ${field.name} (${field.type}): ` +
      `${d.valid.length} valid, ${d.boundary.length} boundary, ` +
      `${d.invalid.length} invalid, ${d.malicious.length} malicious`
    );
  }

  console.log(`\nSaved:`);
  if (format === 'json' || format === 'both') {
    console.log(`  ${writeJson(fieldData, records, baseName)}`);
  }
  if (format === 'csv' || format === 'both') {
    console.log(`  ${writeCsv(fieldData, baseName)}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  validateSchema,
  generateFieldData,
  generateAllFields,
  buildHappyPathRecords,
  writeJson,
  writeCsv,
  csvEscape,
  GENERATORS,
};
