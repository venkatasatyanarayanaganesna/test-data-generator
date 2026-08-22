# Test Data Generator

Generates **valid**, **boundary**, **invalid**, and **malicious** test
data for form and API testing, from a small JSON field schema. No AI
API key required — generation is deterministic and fast, using
[Faker](https://fakerjs.dev/) for realistic values and hand-written
rules for edge/negative/security-probe cases.

## Why

Writing thorough test data by hand is tedious and it's easy to forget
boundary values or injection-style inputs. This tool takes a schema
you already understand (field name, type, constraints) and produces a
categorized dataset you can drop straight into Playwright, Postman, or
a test management tool.

## Setup

```bash
npm install
```

## Usage

```bash
node testDataGen.js --schema sample-schema.json --name signup-form
```

Options:
- `--schema <path>` (required) — path to your JSON schema file
- `--name <name>` — output filename base (defaults to the schema's `name` field)
- `--format json|csv|both` — output format (default: `both`)
- `--records <n>` — number of combined "happy path" sample records to generate (default: 5)

## Schema format

```json
{
  "name": "signup-form",
  "fields": [
    { "name": "email", "type": "email" },
    { "name": "password", "type": "string", "minLength": 8, "maxLength": 64 },
    { "name": "age", "type": "number", "min": 18, "max": 120, "integer": true },
    { "name": "role", "type": "enum", "values": ["admin", "user", "guest"] },
    { "name": "subscribedToNewsletter", "type": "boolean" },
    { "name": "signupDate", "type": "date", "min": "2020-01-01", "max": "2030-12-31" }
  ]
}
```

Supported types: `string`, `number`, `email`, `boolean`, `date`, `enum`.

## What you get

For every field, four categories of test values:

| Category    | What it contains |
|-------------|-------------------|
| `valid`     | Realistic values that satisfy the field's constraints |
| `boundary`  | Values right at, just under, and just over any min/max limits |
| `invalid`   | Wrong types, empty/null, out-of-range, malformed values |
| `malicious` | Canonical XSS/SQLi/overflow/injection probe strings — the same ones used in real input-validation testing, useful for confirming a field properly rejects or escapes hostile input |

Plus a set of ready-to-use **sample records** that combine valid values
across all fields — handy for quickly seeding a happy-path test.

Two output files land in `output/`:
- `<name>.testdata.json` — full categorized data + sample records
- `<name>.testdata.csv` — flattened `field,category,value` rows, easy to import elsewhere

## Try it with the sample

```bash
node testDataGen.js --schema sample-schema.json --name signup-form
```

## Tests

```bash
npm test
```
