/**
 * WebAssembly BitBLT Generator
 *
 * Generates WebAssembly binary code for BitBLT operations.
 */

const {
  encodeULEB128,
  encodeSLEB128,
  createSection,
  concatUint8Arrays,
  Opcodes,
  ValueType,
  SectionId,
} = require("./wasm-binary-utils");

/**
 * Generate a WebAssembly binary module for BitBLT
 *
 * @param {Object} options - Compilation options
 * @param {boolean} shared - Whether to use shared memory
 * @returns {Uint8Array} - The WebAssembly binary module
 */
function generateWasmBitBLTModule(options = {}, shared = false) {
  // WASM module sections
  const sections = [];

  // Add the magic number and version
  const header = new Uint8Array([
    0x00,
    0x61,
    0x73,
    0x6d, // magic: \0asm
    0x01,
    0x00,
    0x00,
    0x00, // version: 1
  ]);

  // Create type section (function signatures)
  const typeSection = createTypeSection();
  sections.push(typeSection);

  // Create import section for memory
  const importSection = createImportSection(shared);
  sections.push(importSection);

  // Create function section (function declarations)
  const functionSection = createFunctionSection();
  sections.push(functionSection);

  // Create export section
  const exportSection = createExportSection();
  sections.push(exportSection);

  // Create code section (function bodies)
  const codeSection = createCodeSection(options);
  sections.push(codeSection);

  // Combine all sections
  return concatUint8Arrays([header, ...sections]);
}

/**
 * Create the type section
 * @returns {Uint8Array} - The type section
 */
function createTypeSection() {
  // We define one function type: (i32, i32, i32, i32, i32, i32, i32, i32, i32, i32, i32) -> ()
  // Parameters: srcBuffer, srcWidth, srcHeight, srcX, srcY, dstBuffer, dstWidth, dstX, dstY, width, height

  // Count of types
  const count = encodeULEB128(1);

  // Function type
  const funcType = new Uint8Array([0x60]); // func

  // Parameter count and types
  const paramCount = encodeULEB128(11); // 11 parameters
  const paramTypes = new Uint8Array(Array(11).fill(ValueType.I32)); // all i32

  // Return count and types
  const returnCount = encodeULEB128(0); // no returns

  // Combine all parts
  const typeContent = concatUint8Arrays([
    count,
    funcType,
    paramCount,
    paramTypes,
    returnCount,
  ]);

  return createSection(SectionId.TYPE, typeContent);
}

/**
 * Create the function section
 * @returns {Uint8Array} - The function section
 */
function createFunctionSection() {
  // Count of functions
  const count = encodeULEB128(1);

  // Function 0 has type 0
  const funcType = encodeULEB128(0);

  // Combine all parts
  const functionContent = concatUint8Arrays([count, funcType]);

  return createSection(SectionId.FUNCTION, functionContent);
}

/**
 * Create the import section for memory
 * @param {boolean} shared - Whether to use shared memory
 * @returns {Uint8Array} - The import section
 */
function createImportSection(shared = false) {
  // Count of imports
  const count = encodeULEB128(1);

  // Import "memory" from "env"
  const moduleNameLen = encodeULEB128(3); // "env" length
  const moduleName = new Uint8Array([0x65, 0x6e, 0x76]); // "env"
  const fieldNameLen = encodeULEB128(6); // "memory" length
  const fieldName = new Uint8Array([0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79]); // "memory"
  const importType = new Uint8Array([0x02]); // memory import

  // Memory limits
  let limits;
  if (shared) {
    // Shared memory with max (required for shared memory)
    limits = new Uint8Array([0x03, 0x01, 0x10]); // 0x03 = shared memory with max, 0x01 = min pages, 0x10 = max pages (16)
  } else {
    // Regular memory with max
    limits = new Uint8Array([0x01, 0x01, 0x10]); // 0x01 = memory with max, 0x01 = min pages, 0x10 = max pages (16)
  }

  // Combine all parts
  const importContent = concatUint8Arrays([
    count,
    moduleNameLen,
    moduleName,
    fieldNameLen,
    fieldName,
    importType,
    limits,
  ]);

  return createSection(SectionId.IMPORT, importContent);
}

/**
 * Create the export section
 * @returns {Uint8Array} - The export section
 */
function createExportSection() {
  // Count of exports
  const count = encodeULEB128(1); // Export function only

  // Export "bitblt" function
  const funcNameLen = encodeULEB128(6); // "bitblt" length
  const funcName = new Uint8Array([0x62, 0x69, 0x74, 0x62, 0x6c, 0x74]); // "bitblt"
  const funcExportType = new Uint8Array([0x00]); // function export
  const funcIndex = encodeULEB128(0); // function index 0

  // Combine all parts
  const exportContent = concatUint8Arrays([
    count,
    funcNameLen,
    funcName,
    funcExportType,
    funcIndex,
  ]);

  return createSection(SectionId.EXPORT, exportContent);
}

/**
 * Create the code section
 * @param {Object} options - Compilation options
 * @returns {Uint8Array} - The code section
 */
function createCodeSection(options) {
  // Count of functions
  const count = encodeULEB128(1);

  // Generate the function body
  const funcBody = generateBitBLTFunctionBody(options);

  // Function body size
  const bodySize = encodeULEB128(funcBody.length);

  // Combine function size and body
  const func = concatUint8Arrays([bodySize, funcBody]);

  // Combine all parts
  const codeContent = concatUint8Arrays([count, func]);

  return createSection(SectionId.CODE, codeContent);
}

/**
 * Generate the BitBLT function body
 * @param {Object} options - Compilation options
 * @returns {Uint8Array} - The function body
 */
function generateBitBLTFunctionBody(options) {
  // Local variables
  const localCount = encodeULEB128(9); // 9 local variables

  // Local variable types
  const localTypes = concatUint8Arrays([
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // srcWidthInUint32 (local 11)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // dstWidthInUint32 (local 12)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // y (local 13)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // srcYPos (local 14)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // dstYPos (local 15)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // x (local 16)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // srcBit (local 17)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // dstBitPos (local 18)
    encodeULEB128(1),
    new Uint8Array([ValueType.I32]), // temp (local 19)
  ]);

  // Function code
  const code = [];

  // Calculate srcWidthInUint32 = Math.ceil(srcWidth / 32)
  // (srcWidth + 31) >> 5
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(1)); // srcWidth
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(31));
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(5));
  code.push(Opcodes.I32_SHR_U);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(11)); // srcWidthInUint32 (local 11)

  // Calculate dstWidthInUint32 = Math.ceil(dstWidth / 32)
  // (dstWidth + 31) >> 5
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(6)); // dstWidth
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(31));
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(5));
  code.push(Opcodes.I32_SHR_U);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(12)); // dstWidthInUint32 (local 12)

  // Outer loop (y = 0; y < height; y++)
  // Initialize y = 0
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(0));
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(13)); // y (local 13)

  // Loop start
  code.push(Opcodes.BLOCK, 0x40); // block with no return type
  code.push(Opcodes.LOOP, 0x40); // loop with no return type

  // Check if y < height
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(13)); // y
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(10)); // height
  code.push(Opcodes.I32_LT_S);

  // If not, break out of the loop
  code.push(Opcodes.I32_EQZ);
  code.push(Opcodes.BR_IF, 0x01); // break to outer block

  // Calculate srcYPos = srcY + y
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(4)); // srcY
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(13)); // y
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(14)); // srcYPos (local 14)

  // Calculate dstYPos = dstY + y
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(8)); // dstY
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(13)); // y
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(15)); // dstYPos (local 15)

  // Inner loop (x = 0; x < width; x++)
  // Initialize x = 0
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(0));
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(16)); // x (local 16)

  // Loop start
  code.push(Opcodes.BLOCK, 0x40); // block with no return type
  code.push(Opcodes.LOOP, 0x40); // loop with no return type

  // Check if x < width
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(9)); // width
  code.push(Opcodes.I32_LT_S);

  // If not, break out of the loop
  code.push(Opcodes.I32_EQZ);
  code.push(Opcodes.BR_IF, 0x01); // break to outer block

  // Calculate srcXPos = srcX + x
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(3)); // srcX
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_ADD);

  // Calculate srcElementIndex = (srcXPos / 32) + srcYPos * srcWidthInUint32
  // First calculate srcXPos / 32 (or srcXPos >> 5)
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(5));
  code.push(Opcodes.I32_SHR_U); // srcXPos >> 5

  // Add srcYPos * srcWidthInUint32
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(14)); // srcYPos
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(11)); // srcWidthInUint32
  code.push(Opcodes.I32_MUL);
  code.push(Opcodes.I32_ADD);

  // Calculate memory offset for srcBuffer[srcElementIndex]
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(0)); // srcBuffer
  code.push(Opcodes.I32_ADD);

  // Calculate srcBitPos = srcXPos % 32
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(3)); // srcX
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(31));
  code.push(Opcodes.I32_AND); // srcXPos & 31

  // Load srcBuffer[srcElementIndex]
  code.push(Opcodes.I32_LOAD, 0x02, 0x00); // alignment=2 (4 bytes), offset=0

  // Extract the bit: (srcBuffer[srcElementIndex] >>> srcBitPos) & 1
  // First shift right by srcBitPos
  code.push(Opcodes.I32_SHR_U);

  // Then AND with 1
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(1));
  code.push(Opcodes.I32_AND);

  // Store the result in srcBit
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(17)); // srcBit (local 17)

  // Calculate dstXPos = dstX + x
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(7)); // dstX
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_ADD);

  // Calculate dstElementIndex = (dstXPos / 32) + dstYPos * dstWidthInUint32
  // First calculate dstXPos / 32 (or dstXPos >> 5)
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(5));
  code.push(Opcodes.I32_SHR_U); // dstXPos >> 5

  // Add dstYPos * dstWidthInUint32
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(15)); // dstYPos
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(12)); // dstWidthInUint32
  code.push(Opcodes.I32_MUL);
  code.push(Opcodes.I32_ADD);

  // Calculate memory offset for dstBuffer[dstElementIndex]
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(5)); // dstBuffer
  code.push(Opcodes.I32_ADD);

  // Calculate dstBitPos = dstXPos % 32
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(7)); // dstX
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(31));
  code.push(Opcodes.I32_AND); // dstXPos & 31

  // Store dstBitPos in local 18
  code.push(Opcodes.LOCAL_TEE, ...encodeULEB128(18)); // Store dstBitPos temporarily

  // Calculate dstElementIndex
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(5)); // dstBuffer
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(7)); // dstX
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(5));
  code.push(Opcodes.I32_SHR_U);
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(15)); // dstYPos
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(12)); // dstWidthInUint32
  code.push(Opcodes.I32_MUL);
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(2));
  code.push(Opcodes.I32_SHL); // Multiply by 4 (bytes per i32)
  code.push(Opcodes.I32_ADD);

  // Load dstBuffer[dstElementIndex] and store in local 19 (temp)
  code.push(Opcodes.I32_LOAD, 0x02, 0x00); // alignment=2 (4 bytes), offset=0
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(19)); // Store in temp

  // Check if srcBit is 1
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(17)); // srcBit
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(1));
  code.push(Opcodes.I32_EQ);

  // If-else block
  code.push(Opcodes.IF, 0x40); // if with no return type

  // If srcBit is 1, set the bit: dstBuffer[dstElementIndex] |= (1 << dstBitPos)
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(19)); // Load temp (current value)
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(1));
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(18)); // dstBitPos
  code.push(Opcodes.I32_SHL);
  code.push(Opcodes.I32_OR);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(19)); // Store back to temp

  code.push(Opcodes.ELSE);

  // If srcBit is 0, clear the bit: dstBuffer[dstElementIndex] &= ~(1 << dstBitPos)
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(19)); // Load temp (current value)
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(1));
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(18)); // dstBitPos
  code.push(Opcodes.I32_SHL);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(-1));
  code.push(Opcodes.I32_XOR);
  code.push(Opcodes.I32_AND);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(19)); // Store back to temp

  code.push(Opcodes.END); // end if

  // Store the result back to dstBuffer[dstElementIndex]
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(5)); // dstBuffer
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(7)); // dstX
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(5));
  code.push(Opcodes.I32_SHR_U);
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(15)); // dstYPos
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(12)); // dstWidthInUint32
  code.push(Opcodes.I32_MUL);
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(2));
  code.push(Opcodes.I32_SHL); // Multiply by 4 (bytes per i32)
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(19)); // Load the result from temp
  code.push(Opcodes.I32_STORE, 0x02, 0x00); // alignment=2 (4 bytes), offset=0

  // Increment x
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(16)); // x
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(1));
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(16)); // x

  // Continue inner loop
  code.push(Opcodes.BR, 0x00);
  code.push(Opcodes.END); // end inner loop
  code.push(Opcodes.END); // end inner block

  // Increment y
  code.push(Opcodes.LOCAL_GET, ...encodeULEB128(13)); // y
  code.push(Opcodes.I32_CONST, ...encodeSLEB128(1));
  code.push(Opcodes.I32_ADD);
  code.push(Opcodes.LOCAL_SET, ...encodeULEB128(13)); // y

  // Continue outer loop
  code.push(Opcodes.BR, 0x00);
  code.push(Opcodes.END); // end outer loop
  code.push(Opcodes.END); // end outer block

  // End function
  code.push(Opcodes.END);

  // Combine locals and code
  return concatUint8Arrays([localCount, localTypes, new Uint8Array(code)]);
}

module.exports = {
  generateWasmBitBLTModule,
};
