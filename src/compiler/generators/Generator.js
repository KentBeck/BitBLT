/**
 * Generator Base Class
 * 
 * This abstract class defines the interface that all code generators must implement.
 * It provides methods for generating, compiling, and executing BitBLT operations.
 */

class Generator {
  /**
   * Create a new generator
   * 
   * @param {Object} options - Configuration options for the generator
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate code for the BitBLT operation
   * 
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {*} - Generated code in a format specific to the generator
   */
  generate(params) {
    throw new Error('Method generate() must be implemented by subclass');
  }

  /**
   * Compile the generated code into an executable form
   * 
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {Function} - A callable function that performs the BitBLT operation
   */
  compile(params) {
    throw new Error('Method compile() must be implemented by subclass');
  }

  /**
   * Execute the BitBLT operation with the given parameters
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
  execute(srcBuffer, srcWidth, srcHeight, srcX, srcY, dstBuffer, dstWidth, dstX, dstY, width, height) {
    throw new Error('Method execute() must be implemented by subclass');
  }

  /**
   * Get a unique cache key for the given parameters
   * 
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {string} - A unique cache key
   */
  getCacheKey(params) {
    throw new Error('Method getCacheKey() must be implemented by subclass');
  }

  /**
   * Analyze the operation for optimization opportunities
   * 
   * @param {Object} params - Parameters for the BitBLT operation
   * @returns {Object} - Analysis results with optimization opportunities
   */
  analyzeOperation(params) {
    throw new Error('Method analyzeOperation() must be implemented by subclass');
  }

  /**
   * Clear any cached compiled functions
   */
  clearCache() {
    throw new Error('Method clearCache() must be implemented by subclass');
  }
}

module.exports = Generator;
