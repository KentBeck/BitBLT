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
  generate(params, shared = false) {
    // Generate a WebAssembly binary module
    return generateWasmBitBLTModule(
      {
        ...this.options,
        ...params,
      },
      shared
    );
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
   * @param {Object} importObject - Optional import object for WebAssembly
   * @param {Uint8Array} wasmBinary - Optional pre-generated WebAssembly binary
   * @returns {Function} - A callable function that performs the BitBLT operation
   */
  async compile(params, importObject = null, wasmBinary = null) {
    await this.initialize();

    const cacheKey = this.getCacheKey(params);

    // Check if we already have a compiled module for these parameters
    if (this.compiledModules.has(cacheKey)) {
      return this.compiledModules.get(cacheKey);
    }

    // Generate the WebAssembly binary module if not provided
    if (!wasmBinary) {
      wasmBinary = this.generate(params);
    }

    try {
      // Compile the WebAssembly module
      const module = await WebAssembly.compile(wasmBinary);

      // Create default import object if none provided
      if (!importObject) {
        importObject = {
          env: {
            memory: new WebAssembly.Memory({ initial: 1 }),
          },
        };
      }

      // Instantiate the module with the import object
      const instance = await WebAssembly.instantiate(module, importObject);

      // Get the exported function
      const bitbltFunction = instance.exports.bitblt;

      // Store the memory and instance with the function
      bitbltFunction.memory = importObject.env.memory;
      bitbltFunction.instance = instance;

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
   * Check if SharedArrayBuffer is available in this environment
   *
   * @returns {boolean} - Whether SharedArrayBuffer is available
   */
  isSharedArrayBufferAvailable() {
    return (
      typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined"
    );
  }

  /**
   * Execute the BitBLT operation with WebAssembly using zero-copy if possible
   *
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

    // Check if we can use zero-copy with SharedArrayBuffer
    const canUseZeroCopy =
      this.isSharedArrayBufferAvailable() &&
      srcBuffer.buffer instanceof SharedArrayBuffer &&
      dstBuffer.buffer instanceof SharedArrayBuffer;

    if (canUseZeroCopy) {
      return this.executeZeroCopy(
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
        height,
        params
      );
    } else {
      return this.executeWithCopy(
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
        height,
        params
      );
    }
  }

  /**
   * Execute BitBLT with zero-copy using SharedArrayBuffer
   *
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
   * @param {Object} params - Compilation parameters
   * @returns {Promise<Uint32Array>} - A Promise that resolves to the destination buffer
   */
  async executeZeroCopy(
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
    height,
    params
  ) {
    try {
      console.log(
        "Using zero-copy WebAssembly execution with SharedArrayBuffer"
      );

      // Get the underlying SharedArrayBuffers
      const srcArrayBuffer = srcBuffer.buffer;
      const dstArrayBuffer = dstBuffer.buffer;

      // Create WebAssembly memory that directly references the JavaScript buffers
      // Note: WebAssembly.Memory doesn't directly support using an existing ArrayBuffer
      // So we'll create a memory and then use it to access the buffers

      // Calculate memory size needed (in pages of 64KB)
      const memoryPages =
        Math.max(
          Math.ceil(srcArrayBuffer.byteLength / 65536),
          Math.ceil(dstArrayBuffer.byteLength / 65536)
        ) + 1; // Add an extra page for safety

      const memory = new WebAssembly.Memory({
        initial: memoryPages,
        maximum: Math.max(memoryPages, 16), // Maximum of 16 pages (1MB) or what we need
        shared: true,
      });

      // Create import object with the shared memory
      const importObject = {
        env: {
          memory: memory,
        },
      };

      // Generate WASM with shared memory flag
      const wasmBinary = this.generate(params, true);

      // Compile the WebAssembly function with the shared memory
      const bitbltFunction = await this.compile(
        params,
        importObject,
        wasmBinary
      );

      // Create views of the source and destination buffers
      const wasmMemory = new Uint32Array(memory.buffer);

      // Copy source and destination buffers to WebAssembly memory
      // This is still a copy, but in a true zero-copy implementation with
      // a custom WASM module, we would pass the buffer addresses directly
      const srcOffset = 0;
      const dstOffset = srcBuffer.length;

      wasmMemory.set(srcBuffer, srcOffset);
      wasmMemory.set(dstBuffer, dstOffset);

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

      // Copy the result back to the destination buffer
      // In a true zero-copy implementation, this would be unnecessary
      for (let i = 0; i < dstBuffer.length; i++) {
        dstBuffer[i] = wasmMemory[dstOffset + i];
      }

      return dstBuffer;
    } catch (err) {
      console.error("Error executing zero-copy WebAssembly BitBLT:", err);
      throw new Error(
        `Failed to execute zero-copy WebAssembly BitBLT: ${err.message}`
      );
    }
  }

  /**
   * Execute BitBLT with copying (fallback method)
   *
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
   * @param {Object} params - Compilation parameters
   * @returns {Promise<Uint32Array>} - A Promise that resolves to the destination buffer
   */
  async executeWithCopy(
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
    height,
    params
  ) {
    try {
      console.log("Using standard WebAssembly execution with copying");

      // Create a memory for WebAssembly to access JavaScript buffers directly
      const memory = new WebAssembly.Memory({
        initial: 1,
        maximum: 16, // Maximum of 16 pages (1MB)
      });
      const memoryView = new Uint32Array(memory.buffer);

      // Create import object with the shared memory
      const importObject = {
        env: {
          memory: memory,
        },
      };

      // Generate WASM with regular memory (not shared)
      const wasmBinary = this.generate(params, false);

      // Compile the WebAssembly function with regular memory
      const bitbltFunction = await this.compile(
        params,
        importObject,
        wasmBinary
      );

      // Get direct pointers to the source and destination buffers
      const srcBufferPtr = 0;
      const dstBufferPtr = srcBuffer.length;

      // Copy source and destination buffers to shared memory
      memoryView.set(srcBuffer, srcBufferPtr);
      memoryView.set(dstBuffer, dstBufferPtr);

      // Call the WebAssembly function with buffer pointers
      bitbltFunction(
        srcBufferPtr,
        srcWidth,
        srcHeight,
        srcX,
        srcY,
        dstBufferPtr,
        dstWidth,
        dstX,
        dstY,
        width,
        height
      );

      // Copy the result back from shared memory to the destination buffer
      for (let i = 0; i < dstBuffer.length; i++) {
        dstBuffer[i] = memoryView[dstBufferPtr + i];
      }

      return dstBuffer;
    } catch (err) {
      console.error("Error executing WebAssembly BitBLT with copying:", err);
      throw new Error(
        `Failed to execute WebAssembly BitBLT with copying: ${err.message}`
      );
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
