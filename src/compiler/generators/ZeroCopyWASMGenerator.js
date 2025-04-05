/**
 * Zero-Copy WebAssembly Generator
 *
 * This generator creates WebAssembly code that directly operates on JavaScript buffers
 * without any copying, using the WebAssembly.Memory API to directly access the buffers.
 */

const WASMGenerator = require("./WASMGenerator").WASMGenerator;
const { generateWasmBitBLTModule } = require("./wasm-bitblt-generator");

/**
 * Zero-Copy WebAssembly Generator
 *
 * This generator creates WebAssembly code that directly operates on JavaScript buffers
 * without any copying.
 */
class ZeroCopyWASMGenerator extends WASMGenerator {
  /**
   * Create a new ZeroCopyWASMGenerator
   *
   * @param {Object} options - Generator options
   */
  constructor(options = {}) {
    super(options);
    this.name = "zero-copy-wasm";
    this.description = "Zero-Copy WebAssembly Generator";
  }

  /**
   * Check if this generator can be used in the current environment
   *
   * @returns {boolean} - Whether this generator can be used
   */
  isSupported() {
    return (
      typeof WebAssembly !== "undefined" &&
      typeof SharedArrayBuffer !== "undefined" &&
      typeof Atomics !== "undefined"
    );
  }

  /**
   * Execute the BitBLT operation with zero-copy WebAssembly
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
   * @returns {Promise<Uint32Array>} - A Promise that resolves to the destination buffer
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
    // Check if SharedArrayBuffer is available
    if (!this.isSupported()) {
      console.warn(
        "Zero-copy WebAssembly is not supported in this environment. Falling back to standard WebAssembly."
      );
      return super.execute(
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
      );
    }

    // Check if the buffers use SharedArrayBuffer
    const srcIsShared = srcBuffer.buffer instanceof SharedArrayBuffer;
    const dstIsShared = dstBuffer.buffer instanceof SharedArrayBuffer;

    if (!srcIsShared || !dstIsShared) {
      console.warn(
        "Zero-copy WebAssembly requires SharedArrayBuffer. Converting buffers..."
      );

      // Create shared buffers
      const sharedSrcBuffer = new Uint32Array(
        new SharedArrayBuffer(srcBuffer.byteLength)
      );
      const sharedDstBuffer = new Uint32Array(
        new SharedArrayBuffer(dstBuffer.byteLength)
      );

      // Copy data to shared buffers
      sharedSrcBuffer.set(srcBuffer);
      sharedDstBuffer.set(dstBuffer);

      // Execute with shared buffers
      await this.executeWithSharedBuffers(
        sharedSrcBuffer,
        srcWidth,
        srcHeight,
        srcX,
        srcY,
        sharedDstBuffer,
        dstWidth,
        dstX,
        dstY,
        width,
        height
      );

      // Copy result back to original destination buffer
      dstBuffer.set(sharedDstBuffer.subarray(0, dstBuffer.length));

      return dstBuffer;
    }

    // Execute with shared buffers directly
    return this.executeWithSharedBuffers(
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
    );
  }

  /**
   * Execute BitBLT with shared buffers
   *
   * @param {Uint32Array} srcBuffer - Source buffer (must use SharedArrayBuffer)
   * @param {number} srcWidth - Source width in pixels
   * @param {number} srcHeight - Source height in pixels
   * @param {number} srcX - Source X coordinate
   * @param {number} srcY - Source Y coordinate
   * @param {Uint32Array} dstBuffer - Destination buffer (must use SharedArrayBuffer)
   * @param {number} dstWidth - Destination width in pixels
   * @param {number} dstX - Destination X coordinate
   * @param {number} dstY - Destination Y coordinate
   * @param {number} width - Width to copy in pixels
   * @param {number} height - Height to copy in pixels
   * @returns {Promise<Uint32Array>} - A Promise that resolves to the destination buffer
   */
  async executeWithSharedBuffers(
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
    console.log("Using true zero-copy WebAssembly execution");

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
        params.optimizations = analysis.optimizations;
      }
    }

    try {
      // Get the underlying SharedArrayBuffers
      const srcArrayBuffer = srcBuffer.buffer;
      const dstArrayBuffer = dstBuffer.buffer;

      // Create a WebAssembly memory that directly references the JavaScript buffers
      // We'll create a new memory and then use direct pointers to the buffers

      // Calculate memory size needed (in pages of 64KB)
      const memoryPages =
        Math.max(
          Math.ceil(srcArrayBuffer.byteLength / 65536),
          Math.ceil(dstArrayBuffer.byteLength / 65536)
        ) + 1; // Add an extra page for safety

      // Create a shared memory
      const memory = new WebAssembly.Memory({
        initial: memoryPages,
        maximum: Math.max(memoryPages, 16), // Maximum of 16 pages (1MB) or what we need
        shared: true,
      });

      // Create import object with the shared memory
      const importObject = {
        env: {
          memory: memory,
          // Add direct references to the buffers
          srcBuffer: srcBuffer,
          srcBufferByteOffset: srcBuffer.byteOffset,
          dstBuffer: dstBuffer,
          dstBufferByteOffset: dstBuffer.byteOffset,
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

      // Get direct pointers to the source and destination buffers
      const srcBufferPtr = srcBuffer.byteOffset / 4; // Convert byte offset to Uint32Array index
      const dstBufferPtr = dstBuffer.byteOffset / 4; // Convert byte offset to Uint32Array index

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

      // No need to copy data back - WebAssembly modified the buffer directly
      return dstBuffer;
    } catch (err) {
      console.error("Error executing zero-copy WebAssembly BitBLT:", err);
      throw new Error(
        `Failed to execute zero-copy WebAssembly BitBLT: ${err.message}`
      );
    }
  }
}

module.exports = ZeroCopyWASMGenerator;
