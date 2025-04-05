/**
 * WebAssembly Generator
 *
 * This generator produces WebAssembly code for BitBLT operations.
 * It directly generates WASM binary format without dependencies on external tools.
 */

const Generator = require("./Generator");
const { generateWasmBitBLTModule } = require("./wasm-bitblt-generator");

class WASMGenerator extends Generator {
  constructor(options = {}) {
    super(options);
    this.isInitialized = false;
    this.compiledModules = new Map();
    this.wasmSupported = typeof WebAssembly !== "undefined";

    if (!this.wasmSupported) {
      console.warn("WebAssembly is not supported in this environment");
    }
  }

  /**
   * Initialize the WebAssembly environment
   */
  async initialize() {
    if (this.isInitialized) return;

    if (!this.wasmSupported) {
      throw new Error("WebAssembly is not supported in this environment");
    }

    this.isInitialized = true;
  }

  /**
   * Generate WebAssembly binary code for BitBLT
   * @param {Object} params - Parameters for code generation
   * @returns {Uint8Array} - WebAssembly binary module
   */
  generate(params) {
    // Generate a WebAssembly binary module
    return generateWasmBitBLTModule({
      ...this.options,
      ...params,
    });
  }

  /**
   * Get a unique cache key for the given parameters
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {string} - A unique cache key
   */
  getCacheKey(params) {
    // Create a key based on the options that affect compilation
    const keyParts = [];

    // Add dimensions if specified
    if (params.srcWidth !== undefined) keyParts.push(`sw${params.srcWidth}`);
    if (params.srcHeight !== undefined) keyParts.push(`sh${params.srcHeight}`);
    if (params.dstWidth !== undefined) keyParts.push(`dw${params.dstWidth}`);
    if (params.srcX !== undefined) keyParts.push(`sx${params.srcX}`);
    if (params.srcY !== undefined) keyParts.push(`sy${params.srcY}`);
    if (params.dstX !== undefined) keyParts.push(`dx${params.dstX}`);
    if (params.dstY !== undefined) keyParts.push(`dy${params.dstY}`);
    if (params.width !== undefined) keyParts.push(`w${params.width}`);
    if (params.height !== undefined) keyParts.push(`h${params.height}`);

    // Add optimization flags
    if (params.unrollLoops) keyParts.push("ul");
    if (params.optimizeAlignedCopy) keyParts.push("oa");
    if (params.useSIMD) keyParts.push("simd");

    return `wasm_${keyParts.join("_")}` || "wasm_default";
  }

  /**
   * Compile the generated WebAssembly code
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {Function} - A callable function that performs the BitBLT operation
   */
  async compile(params) {
    await this.initialize();

    const cacheKey = this.getCacheKey(params);

    // Check if we already have a compiled module for these parameters
    if (this.compiledModules.has(cacheKey)) {
      return this.compiledModules.get(cacheKey);
    }

    // Generate the WebAssembly binary module
    const wasmBinary = this.generate(params);

    try {
      // Compile the WebAssembly module
      const module = await WebAssembly.compile(wasmBinary);

      // Instantiate the module
      const instance = await WebAssembly.instantiate(module);

      // Get the exported function
      const bitbltFunction = instance.exports.bitblt;

      // Cache the compiled function
      this.compiledModules.set(cacheKey, bitbltFunction);

      return bitbltFunction;
    } catch (err) {
      console.error("Error compiling WebAssembly module:", err);
      throw new Error(`Failed to compile WebAssembly module: ${err.message}`);
    }
  }

  /**
   * Analyze the operation for optimization opportunities
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {Object} - Analysis results with optimization opportunities
   */
  analyzeOperation(params) {
    const analysis = {
      canOptimize: false,
      optimizations: [],
    };

    // Check if the operation can be optimized
    if (
      params.width % 32 === 0 &&
      params.srcX % 32 === 0 &&
      params.dstX % 32 === 0
    ) {
      analysis.canOptimize = true;
      analysis.optimizations.push("word-aligned");
    }

    // Check if SIMD can be used
    if (
      typeof WebAssembly.validate === "function" &&
      WebAssembly.validate(
        new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01,
          0x60, 0x00, 0x00, 0x03, 0x02, 0x01, 0x00, 0x0a, 0x09, 0x01, 0x07,
          0x00, 0xfd, 0x0f, 0x00, 0x00, 0x0b,
        ])
      )
    ) {
      analysis.canOptimize = true;
      analysis.optimizations.push("simd");
    }

    return analysis;
  }

  /**
   * Check if this generator is asynchronous
   *
   * @returns {boolean} - Whether this generator requires async execution
   */
  isAsync() {
    return true;
  }

  /**
   * Execute the BitBLT operation with WebAssembly
   * @param {Uint32Array} srcBuffer - Source buffer
   * @param {number} srcWidth - Source width in pixels
   * @param {number} srcHeight - Source height in pixels
   * @param {number} srcX - Source X coordinate
   * @param {number} srcY - Source Y coordinate
   * @param {Uint32Array} dstBuffer - Destination buffer
   * @param {number} dstWidth - Destination width in pixels
   * @param {number} dstX - Destination X coordinate
   * @param {number} dstY - Destination Y coordinate
   * @param {number} width - Width to copy in pixels
   * @param {number} height - Height to copy in pixels
   * @returns {Promise<Uint32Array>} - A Promise that resolves to the destination buffer after the operation
   */
  async execute(
    srcBuffer,
    srcWidth,
    srcHeight,
    srcX,
    srcY,
    dstBuffer,
    dstWidth,
    dstX,
    dstY,
    width,
    height
  ) {
    const params = {
      srcWidth,
      srcHeight,
      srcX,
      srcY,
      dstWidth,
      dstX,
      dstY,
      width,
      height,
      ...this.options,
    };

    // Analyze the operation for optimization opportunities
    if (this.options.analyzeOperations) {
      const analysis = this.analyzeOperation(params);

      if (analysis.canOptimize) {
        // Apply optimizations
        params.optimizations = analysis.optimizations;
      }
    }

    try {
      // Compile the WebAssembly function
      const bitbltFunction = await this.compile(params);

      // Create a memory view for the WebAssembly module
      const memory = bitbltFunction.memory;
      const memoryView = new Uint32Array(memory.buffer);

      // Copy source buffer to WebAssembly memory
      const srcOffset = 0;
      memoryView.set(srcBuffer, srcOffset);

      // Copy destination buffer to WebAssembly memory
      const dstOffset = srcBuffer.length;
      memoryView.set(dstBuffer, dstOffset);

      // Call the WebAssembly function
      bitbltFunction(
        srcOffset,
        srcWidth,
        srcHeight,
        srcX,
        srcY,
        dstOffset,
        dstWidth,
        dstX,
        dstY,
        width,
        height
      );

      // Copy the result back from WebAssembly memory
      for (let i = 0; i < dstBuffer.length; i++) {
        dstBuffer[i] = memoryView[dstOffset + i];
      }

      return dstBuffer;
    } catch (err) {
      console.error("Error executing WebAssembly BitBLT:", err);
      throw new Error(`Failed to execute WebAssembly BitBLT: ${err.message}`);
    }
  }

  /**
   * Clear the cache of compiled modules
   */
  clearCache() {
    this.compiledModules.clear();
  }
}

module.exports = WASMGenerator;
