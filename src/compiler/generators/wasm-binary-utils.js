/**
 * WebAssembly Binary Utilities
 *
 * Utilities for generating WebAssembly binary format directly.
 */

/**
 * Encode an unsigned LEB128 integer
 * @param {number} value - The value to encode
 * @returns {Uint8Array} - The encoded bytes
 */
function encodeULEB128(value) {
  const bytes = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (value !== 0);

  return new Uint8Array(bytes);
}

/**
 * Encode a signed LEB128 integer
 * @param {number} value - The value to encode
 * @returns {Uint8Array} - The encoded bytes
 */
function encodeSLEB128(value) {
  const bytes = [];
  let more = true;

  while (more) {
    let byte = value & 0x7f;
    value >>= 7;

    // Sign bit of byte is second high order bit (0x40)
    if (
      (value === 0 && (byte & 0x40) === 0) ||
      (value === -1 && (byte & 0x40) !== 0)
    ) {
      more = false;
    } else {
      byte |= 0x80;
    }

    bytes.push(byte);
  }

  return new Uint8Array(bytes);
}

/**
 * Create a WASM section
 * @param {number} id - Section ID
 * @param {Uint8Array} content - Section content
 * @returns {Uint8Array} - The complete section
 */
function createSection(id, content) {
  const sizeBytes = encodeULEB128(content.length);
  const result = new Uint8Array(1 + sizeBytes.length + content.length);

  result[0] = id;
  result.set(sizeBytes, 1);
  result.set(content, 1 + sizeBytes.length);

  return result;
}

/**
 * Concatenate multiple Uint8Arrays
 * @param {Uint8Array[]} arrays - Arrays to concatenate
 * @returns {Uint8Array} - The concatenated array
 */
function concatUint8Arrays(arrays) {
  // Calculate total length
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);

  // Create new array and copy data
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

/**
 * WASM opcodes
 */
const Opcodes = {
  // Control flow
  BLOCK: 0x02,
  LOOP: 0x03,
  IF: 0x04,
  ELSE: 0x05,
  END: 0x0b,
  BR: 0x0c,
  BR_IF: 0x0d,
  RETURN: 0x0f,

  // Call operators
  CALL: 0x10,

  // Parametric operators
  DROP: 0x1a,

  // Variable access
  LOCAL_GET: 0x20,
  LOCAL_SET: 0x21,
  LOCAL_TEE: 0x22,
  GLOBAL_GET: 0x23,
  GLOBAL_SET: 0x24,

  // Memory operators
  I32_LOAD: 0x28,
  I32_STORE: 0x36,

  // Constants
  I32_CONST: 0x41,

  // Numeric operators
  I32_EQZ: 0x45,
  I32_EQ: 0x46,
  I32_NE: 0x47,
  I32_LT_S: 0x48,
  I32_LT_U: 0x49,
  I32_GT_S: 0x4a,
  I32_GT_U: 0x4b,
  I32_LE_S: 0x4c,
  I32_LE_U: 0x4d,
  I32_GE_S: 0x4e,
  I32_GE_U: 0x4f,

  // Arithmetic
  I32_ADD: 0x6a,
  I32_SUB: 0x6b,
  I32_MUL: 0x6c,
  I32_DIV_S: 0x6d,
  I32_DIV_U: 0x6e,
  I32_REM_S: 0x6f,
  I32_REM_U: 0x70,
  I32_AND: 0x71,
  I32_OR: 0x72,
  I32_XOR: 0x73,
  I32_SHL: 0x74,
  I32_SHR_S: 0x75,
  I32_SHR_U: 0x76,
  I32_ROTL: 0x77,
  I32_ROTR: 0x78,
};

/**
 * WASM value types
 */
const ValueType = {
  I32: 0x7f,
  I64: 0x7e,
  F32: 0x7d,
  F64: 0x7c,
};

/**
 * WASM section IDs
 */
const SectionId = {
  TYPE: 1,
  IMPORT: 2,
  FUNCTION: 3,
  MEMORY: 5,
  EXPORT: 7,
  CODE: 10,
};

module.exports = {
  encodeULEB128,
  encodeSLEB128,
  createSection,
  concatUint8Arrays,
  Opcodes,
  ValueType,
  SectionId,
};
