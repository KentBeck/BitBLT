/**
 * JavaScript Generator
 *
 * This generator produces JavaScript code for BitBLT operations.
 * It generates optimized JavaScript code based on the provided parameters.
 */

const Generator = require("./Generator");

class JavaScriptGenerator extends Generator {
  constructor(options = {}) {
    super(options);
    this.compiledFunctions = new Map();
  }

  /**
   * Check if this generator is asynchronous
   *
   * @returns {boolean} - Whether this generator requires async execution
   */
  isAsync() {
    return false; // JavaScript generator is synchronous
  }

  /**
   * Generate JavaScript code for the BitBLT operation
   *
   * @param {Object} params - Parameters for code generation
   * @returns {string} - Generated JavaScript code as a string
   */
  generate(params) {
    // Merge options with defaults
    const opts = {
      unrollLoops: false,
      inlineConstants: true,
      optimizeAlignedCopy: true,
      debug: false,
      ...this.options,
      ...params,
    };

    // Start building the function code
    let code = [];

    // Function signature
    code.push(`function generatedBitBLT(
  srcBuffer,    // source pixel buffer (Uint32Array with 32 pixels per element)
  srcWidth,     // width of source buffer in pixels (not Uint32 elements)
  srcHeight,    // height of source buffer
  srcX,         // x coordinate in source
  srcY,         // y coordinate in source
  dstBuffer,    // destination pixel buffer (Uint32Array with 32 pixels per element)
  dstWidth,     // width of destination buffer in pixels (not Uint32 elements)
  dstX,         // x coordinate in destination
  dstY,         // y coordinate in destination
  width,        // width of region to copy in pixels
  height        // height of region to copy in pixels
) {`);

    // Add initialization code
    code.push("  // Calculate width in Uint32 elements (32 bits per element)");

    // If srcWidth is provided as a constant, inline it
    if (opts.inlineConstants && opts.srcWidth !== undefined) {
      code.push(`  const srcWidthInUint32 = ${Math.ceil(opts.srcWidth / 32)};`);
    } else {
      code.push("  const srcWidthInUint32 = Math.ceil(srcWidth / 32);");
    }

    // If dstWidth is provided as a constant, inline it
    if (opts.inlineConstants && opts.dstWidth !== undefined) {
      code.push(`  const dstWidthInUint32 = ${Math.ceil(opts.dstWidth / 32)};`);
    } else {
      code.push("  const dstWidthInUint32 = Math.ceil(dstWidth / 32);");
    }

    // Add the main loop structure
    if (opts.unrollLoops && opts.height !== undefined) {
      // Unroll the y-loop if height is known
      for (let y = 0; y < opts.height; y++) {
        // Add code for each row
        if (opts.inlineConstants && opts.srcY !== undefined) {
          code.push(`  // Row ${y}`);
          code.push(`  const srcYPos_${y} = ${opts.srcY + y};`);
        } else {
          code.push(`  // Row ${y}`);
          code.push(`  const srcYPos_${y} = srcY + ${y};`);
        }

        if (opts.inlineConstants && opts.dstY !== undefined) {
          code.push(`  const dstYPos_${y} = ${opts.dstY + y};`);
        } else {
          code.push(`  const dstYPos_${y} = dstY + ${y};`);
        }

        // Add the inner loop for pixels in this row
        if (opts.unrollLoops && opts.width !== undefined) {
          // Unroll the x-loop if width is known
          for (let x = 0; x < opts.width; x++) {
            this.addPixelCopyCode(code, x, opts, x + y * opts.width, y);
          }
        } else {
          // Use a regular loop for the x-dimension
          code.push("  // Process each pixel in the row");
          code.push("  for (let x = 0; x < width; x++) {");
          this.addPixelCopyCode(code, null, opts, 0, null);
          code.push("  }");
        }
      }
    } else {
      // Use a regular loop for the y-dimension
      code.push("  // Iterate through each row");
      code.push("  for (let y = 0; y < height; y++) {");
      code.push(
        "    // Calculate the y-position in the source and destination"
      );
      code.push("    const srcYPos = srcY + y;");
      code.push("    const dstYPos = dstY + y;");
      code.push("");
      code.push("    // Process each pixel in the row");
      code.push("    for (let x = 0; x < width; x++) {");
      this.addPixelCopyCode(code, null, opts, 0, null);
      code.push("    }");
      code.push("  }");
    }

    // Close the function
    code.push("}");

    // Join the code lines and return
    return code.join("\n");
  }

  /**
   * Add code for copying a single pixel
   *
   * @param {string[]} code - Array of code lines to append to
   * @param {number|null} x - X position if known (for unrolled loops), or null
   * @param {Object} opts - Compilation options
   * @param {number} pixelIndex - Index for variable names in unrolled loops
   * @param {number|null} y - Y position if known (for unrolled loops), or null
   */
  addPixelCopyCode(code, x, opts, pixelIndex = 0, y = null) {
    const indent = x === null ? "    " : "  ";
    const suffix = x === null ? "" : `_${pixelIndex}`;
    const ySuffix = y === null ? "" : `_${y}`;

    // Calculate source and destination positions
    if (x === null) {
      // Dynamic x position (inside a loop)
      code.push(
        `${indent}// Calculate the x-position in the source and destination`
      );

      if (opts.inlineConstants && opts.srcX !== undefined) {
        code.push(`${indent}const srcXPos = ${opts.srcX} + x;`);
      } else {
        code.push(`${indent}const srcXPos = srcX + x;`);
      }

      if (opts.inlineConstants && opts.dstX !== undefined) {
        code.push(`${indent}const dstXPos = ${opts.dstX} + x;`);
      } else {
        code.push(`${indent}const dstXPos = dstX + x;`);
      }
    } else {
      // Static x position (unrolled loop)
      code.push(`${indent}// Pixel at x=${x}`);

      if (opts.inlineConstants && opts.srcX !== undefined) {
        code.push(`${indent}const srcXPos${suffix} = ${opts.srcX + x};`);
      } else {
        code.push(`${indent}const srcXPos${suffix} = srcX + ${x};`);
      }

      if (opts.inlineConstants && opts.dstX !== undefined) {
        code.push(`${indent}const dstXPos${suffix} = ${opts.dstX + x};`);
      } else {
        code.push(`${indent}const dstXPos${suffix} = dstX + ${x};`);
      }
    }

    // Calculate buffer indices
    code.push(`${indent}// Calculate which Uint32 element contains the pixel`);
    code.push(
      `${indent}const srcElementIndex${suffix} = Math.floor(srcXPos${suffix} / 32) + srcYPos${ySuffix} * srcWidthInUint32;`
    );
    code.push(
      `${indent}const dstElementIndex${suffix} = Math.floor(dstXPos${suffix} / 32) + dstYPos${ySuffix} * dstWidthInUint32;`
    );

    // Calculate bit positions
    code.push(
      `${indent}// Calculate the bit position within the Uint32 element (0-31)`
    );
    code.push(`${indent}const srcBitPos${suffix} = srcXPos${suffix} % 32;`);
    code.push(`${indent}const dstBitPos${suffix} = dstXPos${suffix} % 32;`);

    // Extract and set the bit
    code.push(`${indent}// Extract the bit from the source`);
    code.push(
      `${indent}const srcBit${suffix} = (srcBuffer[srcElementIndex${suffix}] >>> srcBitPos${suffix}) & 1;`
    );

    // Set or clear the bit
    code.push(
      `${indent}// Clear the destination bit and set it to the source bit value`
    );
    code.push(`${indent}if (srcBit${suffix} === 1) {`);
    code.push(`${indent}  // Set the bit`);
    code.push(
      `${indent}  dstBuffer[dstElementIndex${suffix}] |= 1 << dstBitPos${suffix};`
    );
    code.push(`${indent}} else {`);
    code.push(`${indent}  // Clear the bit`);
    code.push(
      `${indent}  dstBuffer[dstElementIndex${suffix}] &= ~(1 << dstBitPos${suffix});`
    );
    code.push(`${indent}}`);
  }

  /**
   * Compile the generated JavaScript code into a function
   *
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {Function} - A callable function that performs the BitBLT operation
   */
  compile(params) {
    // Get a cache key for these parameters
    const cacheKey = this.getCacheKey(params);

    // Check if we already have a compiled function for these parameters
    if (this.compiledFunctions.has(cacheKey)) {
      return this.compiledFunctions.get(cacheKey);
    }

    // Generate the JavaScript code
    const code = this.generate(params);

    // If debug is enabled, log the generated code
    if (params.debug || this.options.debug) {
      console.log("Generated BitBLT code:");
      console.log(code);
    }

    try {
      // Compile the code into a function
      const compiledFn = new Function("return " + code)();

      // Cache the compiled function
      this.compiledFunctions.set(cacheKey, compiledFn);

      return compiledFn;
    } catch (err) {
      console.error("Error compiling JavaScript function:", err);
      console.error("Generated code:", code);
      throw new Error(`Failed to compile JavaScript function: ${err.message}`);
    }
  }

  /**
   * Execute the BitBLT operation with the compiled JavaScript function
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
   * @returns {Uint32Array} - The destination buffer after the operation
   */
  execute(
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

    // Compile the JavaScript function
    const bitbltFunction = this.compile(params);

    // Execute the function
    bitbltFunction(
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

    return dstBuffer;
  }

  /**
   * Get a unique cache key for the given parameters
   *
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

    // Add compiler flags
    if (params.unrollLoops) keyParts.push("ul");
    if (params.inlineConstants) keyParts.push("ic");
    if (params.optimizeAlignedCopy) keyParts.push("oa");

    return `js_${keyParts.join("_")}` || "js_default";
  }

  /**
   * Analyze the operation for optimization opportunities
   *
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {Object} - Analysis results with optimization opportunities
   */
  analyzeOperation(params) {
    const analysis = {
      canOptimize: false,
      optimizations: [],
    };

    // Check if the operation can be optimized
    if (params.width !== undefined && params.height !== undefined) {
      // Check for small regions that can benefit from loop unrolling
      if (params.width * params.height <= 64) {
        analysis.canOptimize = true;
        analysis.optimizations.push("unroll-loops");
        params.unrollLoops = true;
      }

      // Check for word-aligned operations
      if (
        params.width % 32 === 0 &&
        (params.srcX === undefined || params.srcX % 32 === 0) &&
        (params.dstX === undefined || params.dstX % 32 === 0)
      ) {
        analysis.canOptimize = true;
        analysis.optimizations.push("word-aligned");
        params.optimizeAlignedCopy = true;
      }
    }

    return analysis;
  }

  /**
   * Clear the cache of compiled functions
   */
  clearCache() {
    this.compiledFunctions.clear();
  }
}

module.exports = JavaScriptGenerator;
