import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';

import {
  parseArgs,
  validateSchema,
  generateFieldData,
  generateAllFields,
  buildHappyPathRecords,
  writeJson,
  writeCsv,
  csvEscape,
  GENERATORS,
} from '../testDataGen.js';

// ---------- parseArgs ----------

describe('parseArgs', () => {
  it('throws when --schema is missing', () => {
    expect(() => parseArgs([])).toThrow(/Usage/);
  });

  it('throws when the schema file does not exist', () => {
    expect(() => parseArgs(['--schema', '/no/such/file.json'])).toThrow(/not found/);
  });

  it('loads a schema file and applies defaults', () => {
    const tmpFile = path.join(os.tmpdir(), `schema-${Date.now()}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({ name: 'my-form', fields: [{ name: 'age', type: 'number' }] })
    );

    const result = parseArgs(['--schema', tmpFile]);
    expect(result.baseName).toBe('my-form');
    expect(result.format).toBe('both');
    expect(result.recordCount).toBe(5);

    fs.unlinkSync(tmpFile);
  });

  it('lets --name, --format, and --records override schema/file defaults', () => {
    const tmpFile = path.join(os.tmpdir(), `schema-${Date.now()}.json`);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({ name: 'my-form', fields: [{ name: 'age', type: 'number' }] })
    );

    const result = parseArgs([
      '--schema', tmpFile,
      '--name', 'override-name',
      '--format', 'json',
      '--records', '3',
    ]);
    expect(result.baseName).toBe('override-name');
    expect(result.format).toBe('json');
    expect(result.recordCount).toBe(3);

    fs.unlinkSync(tmpFile);
  });

  it('rejects a schema with no fields array', () => {
    const tmpFile = path.join(os.tmpdir(), `schema-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify({ name: 'empty' }));

    expect(() => parseArgs(['--schema', tmpFile])).toThrow(/non-empty "fields" array/);

    fs.unlinkSync(tmpFile);
  });
});

// ---------- validateSchema ----------

describe('validateSchema', () => {
  it('accepts a well-formed schema', () => {
    expect(() =>
      validateSchema({ fields: [{ name: 'age', type: 'number' }] })
    ).not.toThrow();
  });

  it('rejects a field with no name', () => {
    expect(() => validateSchema({ fields: [{ type: 'number' }] })).toThrow(/missing "name"/);
  });

  it('rejects a field with no type', () => {
    expect(() => validateSchema({ fields: [{ name: 'age' }] })).toThrow(/missing "type"/);
  });

  it('rejects an unsupported type', () => {
    expect(() =>
      validateSchema({ fields: [{ name: 'x', type: 'unknown-type' }] })
    ).toThrow(/unsupported type/);
  });

  it('rejects an enum field with no values', () => {
    expect(() =>
      validateSchema({ fields: [{ name: 'role', type: 'enum' }] })
    ).toThrow(/no "values" array/);
  });
});

// ---------- per-type generators ----------

describe('generators', () => {  it('string generator produces boundary values at the configured lengths', () => {
    const data = generateFieldData({ type: 'string', minLength: 5, maxLength: 10 });
    const lengths = data.boundary.map((v) => String(v).length);
    expect(lengths).toEqual(expect.arrayContaining([4, 5, 6, 9, 10, 11]));
  });

  it('string generator includes canonical malicious payloads', () => {
    const data = generateFieldData({ type: 'string', minLength: 1, maxLength: 50 });
    expect(data.malicious).toContain('<script>alert(1)</script>');
    expect(data.malicious.some((v) => v.includes('DROP TABLE'))).toBe(true);
  });

  it('number generator produces correct min/max boundary values', () => {
    const data = generateFieldData({ type: 'number', min: 18, max: 65 });
    expect(data.boundary).toEqual([17, 18, 19, 64, 65, 66]);
  });

  it('number generator invalid values include non-numeric types', () => {
    const data = generateFieldData({ type: 'number', min: 0, max: 100 });
    expect(data.invalid).toContain('not a number');
    expect(data.invalid).toContain(null);
  });

  it('email generator produces at least one @-containing valid address', () => {
    const data = generateFieldData({ type: 'email' });
    expect(data.valid.every((v) => v.includes('@'))).toBe(true);
  });

  it('email generator invalid values do not all contain a valid shape', () => {
    const data = generateFieldData({ type: 'email' });
    expect(data.invalid).toContain('not-an-email');
  });

  it('boolean generator returns exactly true/false as valid', () => {
    const data = generateFieldData({ type: 'boolean' });
    expect(data.valid).toEqual([true, false]);
  });

  it('date generator respects min/max boundaries', () => {
    const data = generateFieldData({ type: 'date', min: '2025-01-10', max: '2025-01-20' });
    expect(data.boundary).toContain('2025-01-10');
    expect(data.boundary).toContain('2025-01-20');
    expect(data.boundary).toContain('2025-01-09'); // just before min, invalid
    expect(data.boundary).toContain('2025-01-21'); // just after max, invalid
  });

  it('date generator flags impossible calendar dates as invalid', () => {
    const data = generateFieldData({ type: 'date' });
    expect(data.invalid).toContain('2026-02-30');
  });

  it('enum generator valid values match the schema exactly', () => {
    const data = generateFieldData({ type: 'enum', values: ['admin', 'user', 'guest'] });
    expect(data.valid).toEqual(['admin', 'user', 'guest']);
  });

  it('enum generator invalid values include a case-mismatched variant', () => {
    const data = generateFieldData({ type: 'enum', values: ['admin', 'user'] });
    expect(data.invalid).toContain('ADMIN');
  });

  it('every generator type is represented in GENERATORS', () => {
    expect(Object.keys(GENERATORS).sort()).toEqual(
      ['boolean', 'date', 'email', 'enum', 'number', 'string'].sort()
    );
  });
});

// ---------- generateAllFields / buildHappyPathRecords ----------

const sampleSchema = {
  name: 'sample',
  fields: [
    { name: 'age', type: 'number', min: 18, max: 65 },
    { name: 'role', type: 'enum', values: ['admin', 'user'] },
  ],
};

describe('generateAllFields', () => {
  it('generates a bucket of data for every field in the schema', () => {
    const result = generateAllFields(sampleSchema);
    expect(Object.keys(result)).toEqual(['age', 'role']);
    expect(result.age.valid.length).toBeGreaterThan(0);
  });
});

describe('buildHappyPathRecords', () => {
  it('builds the requested number of records using only valid values', () => {
    const fieldData = generateAllFields(sampleSchema);
    const records = buildHappyPathRecords(sampleSchema, fieldData, 4);

    expect(records).toHaveLength(4);
    for (const record of records) {
      expect(fieldData.age.valid).toContain(record.age);
      expect(fieldData.role.valid).toContain(record.role);
    }
  });
});

// ---------- csvEscape ----------

describe('csvEscape', () => {
  it('leaves plain values untouched', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('quotes and escapes values containing commas', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  it('escapes embedded double quotes', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('converts null/undefined to an empty string', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });
});

// ---------- writeJson / writeCsv ----------

describe('writeJson and writeCsv', () => {
  it('write files to the given output directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testdatagen-'));
    const fieldData = generateAllFields(sampleSchema);
    const records = buildHappyPathRecords(sampleSchema, fieldData, 2);

    const jsonPath = writeJson(fieldData, records, 'sample', tmpDir);
    const csvPath = writeCsv(fieldData, 'sample', tmpDir);

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(csvPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(parsed.sampleRecords).toHaveLength(2);
    expect(Object.keys(parsed.fields)).toEqual(['age', 'role']);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
