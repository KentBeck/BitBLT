/**
 * BitBLT - Bit Block Transfer
 * 
 * This module provides the main BitBLT function that uses both the reference
 * implementation and the compiled version, comparing the results to ensure
 * correctness.
 */

// Import the reference implementation
const referenceBitBLT = require('./reference/bitblt').bitblt;

// Import the compiler
const { compileBitBLT, analyzeOperation } = require('./compiler/bitblt-compiler');

// Configuration
const config = {
  // Whether to verify that compiled and reference implementations produce the same result
  verifyResults: true,
  
  // Whether to use the compiled version (if false, only the reference implementation is used)
  useCompiled: true,
  
  // Whether to analyze operations for optimization opportunities
  analyzeOperations: true,
  
  // Whether to log performance metrics
  logPerformance: false,
  
  // Whether to automatically recompile when patterns are detected
  autoRecompile: false
};

// Cached compiled implementation
let cachedCompiledBitBLT = null;

/**
 * Compare two buffers to ensure they are identical
 * 
 * @param {Uint32Array} buffer1 - First buffer
 * @param {Uint32Array} buffer2 - Second buffer
 * @returns {boolean} - Whether the buffers are identical
 */
function buffersAreEqual(buffer1, buffer2) {
  if (buffer1.length !== buffer2.length) {
    return false;
  }
  
  for (let i = 0; i < buffer1.length; i++) {
    if (buffer1[i] !== buffer2[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the value of a specific bit in a packed buffer
 * 
 * @param {Uint32Array} buffer - The buffer containing packed pixels
 * @param {number} width - Width of the buffer in pixels
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} - The bit value (0 or 1)
 */
function getPixel(buffer, width, x, y) {
  const widthInUint32 = Math.ceil(width / 32);
  const elementIndex = Math.floor(x / 32) + y * widthInUint32;
  const bitPos = x % 32;
  return (buffer[elementIndex] >>> bitPos) & 1;
}

/**
 * Find the first difference between two buffers
 * 
 * @param {Uint32Array} buffer1 - First buffer
 * @param {Uint32Array} buffer2 - Second buffer
 * @param {number} width - Width of the buffers in pixels
 * @param {number} height - Height of the buffers in pixels
 * @returns {Object|null} - The first difference found, or null if buffers are identical
 */
function findFirstDifference(buffer1, buffer2, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit1 = getPixel(buffer1, width, x, y);
      const bit2 = getPixel(buffer2, width, x, y);
      
      if (bit1 !== bit2) {
        return { x, y, expected: bit1, actual: bit2 };
      }
    }
  }
  
  return null;
}

/**
 * Main BitBLT function
 * 
 * This function uses both the reference implementation and the compiled version,
 * comparing the results to ensure correctness.
 * 
 * @param {Uint32Array} srcBuffer - Source pixel buffer
 * @param {number} srcWidth - Width of source buffer in pixels
 * @param {number} srcHeight - Height of source buffer
 * @param {number} srcX - X coordinate in source
 * @param {number} srcY - Y coordinate in source
 * @param {Uint32Array} dstBuffer - Destination pixel buffer
 * @param {number} dstWidth - Width of destination buffer in pixels
 * @param {number} dstX - X coordinate in destination
 * @param {number} dstY - Y coordinate in destination
 * @param {number} width - Width of region to copy
 * @param {number} height - Height of region to copy
 * @param {Object} options - Additional options
 */
function bitblt(
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
  options = {}
) {
  // Merge options with config
  const opts = { ...config, ...options };
  
  // If we're not using the compiled version, just use the reference implementation
  if (!opts.useCompiled) {
    referenceBitBLT(
      srcBuffer, srcWidth, srcHeight, srcX, srcY,
      dstBuffer, dstWidth, dstX, dstY, width, height
    );
    return;
  }
  
  // Analyze the operation for optimization opportunities
  if (opts.analyzeOperations) {
    const analysis = analyzeOperation(
      srcBuffer, srcWidth, srcHeight, srcX, srcY,
      dstWidth, dstX, dstY, width, height
    );
    
    // If we can optimize and auto-recompile is enabled, recompile
    if (analysis.canOptimize && opts.autoRecompile) {
      cachedCompiledBitBLT = compileBitBLT({
        srcWidth, srcHeight, dstWidth,
        srcX, srcY, dstX, dstY, width, height,
        patterns: analysis.patterns
      });
    }
  }
  
  // If we don't have a cached compiled implementation, create one
  if (!cachedCompiledBitBLT) {
    cachedCompiledBitBLT = compileBitBLT({
      srcWidth, srcHeight, dstWidth
    });
  }
  
  // If we're verifying results, we need to create a copy of the destination buffer
  if (opts.verifyResults) {
    // Create a copy of the destination buffer
    const verifyBuffer = new Uint32Array(dstBuffer.length);
    dstBuffer.forEach((value, index) => {
      verifyBuffer[index] = value;
    });
    
    // Apply the reference implementation to the copy
    referenceBitBLT(
      srcBuffer, srcWidth, srcHeight, srcX, srcY,
      verifyBuffer, dstWidth, dstX, dstY, width, height
    );
    
    // Apply the compiled implementation to the original
    cachedCompiledBitBLT(
      srcBuffer, srcWidth, srcHeight, srcX, srcY,
      dstBuffer, dstWidth, dstX, dstY, width, height
    );
    
    // Verify that the results are the same
    if (!buffersAreEqual(dstBuffer, verifyBuffer)) {
      const diff = findFirstDifference(verifyBuffer, dstBuffer, dstWidth, Math.ceil(dstBuffer.length * 32 / dstWidth));
      throw new Error(
        `BitBLT verification failed: compiled and reference implementations produced different results. ` +
        `First difference at (${diff.x}, ${diff.y}): expected ${diff.expected}, got ${diff.actual}`
      );
    }
  } else {
    // Just apply the compiled implementation
    cachedCompiledBitBLT(
      srcBuffer, srcWidth, srcHeight, srcX, srcY,
      dstBuffer, dstWidth, dstX, dstY, width, height
    );
  }
}

// Export the BitBLT function and utilities
module.exports = {
  bitblt,
  getPixel,
  config,
  // Re-export utilities from the reference implementation
  createTestBuffer: require('./reference/bitblt').createTestBuffer
};
