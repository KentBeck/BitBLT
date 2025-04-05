/**
 * Generator Factory
 *
 * This factory class is responsible for creating the appropriate generator
 * based on the requested type.
 */

class GeneratorFactory {
  /**
   * Create a new generator of the specified type
   *
   * @param {string} type - The type of generator to create ('javascript', 'wasm', etc.)
   * @param {Object} options - Configuration options for the generator
   * @returns {Generator} - A generator instance
   */
  static createGenerator(type, options = {}) {
    // Convert type to lowercase for case-insensitive comparison
    const generatorType = type.toLowerCase();

    // Select the appropriate generator based on type
    switch (generatorType) {
      case "js":
      case "javascript":
        // Lazy-load the JavaScriptGenerator to avoid circular dependencies
        const JavaScriptGenerator = require("./generators/JavaScriptGenerator");
        return new JavaScriptGenerator(options);

      case "wasm":
      case "webassembly":
        // Lazy-load the WASMGenerator to avoid circular dependencies
        const { WASMGenerator } = require("./generators/WASMGenerator");
        return new WASMGenerator(options);

      case "zero-copy-wasm":
      case "zerocopy-wasm":
      case "zerocopy":
        // Lazy-load the ZeroCopyWASMGenerator to avoid circular dependencies
        const ZeroCopyWASMGenerator = require("./generators/ZeroCopyWASMGenerator");
        return new ZeroCopyWASMGenerator(options);

      default:
        throw new Error(`Unknown generator type: ${type}`);
    }
  }

  /**
   * Get a list of available generator types
   *
   * @returns {string[]} - Array of available generator types
   */
  static getAvailableGenerators() {
    return ["javascript", "wasm", "zero-copy-wasm"];
  }
}

module.exports = GeneratorFactory;
