function generate() {
  const valid = [true, false];

  // Booleans don't have meaningful numeric boundaries, so 'boundary' holds
  // the closest analog: common truthy/falsy values developers accidentally
  // accept when a field isn't strictly typed.
  const boundary = [1, 0];

  const invalid = ['true', 'false', 'yes', 'no', null, undefined, 2, -1, '', []];

  const malicious = ["<script>alert(1)</script>", "' OR '1'='1"];

  return { valid, boundary, invalid, malicious };
}

module.exports = { generate };
