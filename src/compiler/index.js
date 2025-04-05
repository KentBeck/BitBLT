/**
 * BitBLT Compiler
 *
 * This module provides access to the BitBLT compiler infrastructure,
 * including generators for different target platforms.
 */

const GeneratorFactory = require("./GeneratorFactory");

// Export the factory and generator classes
module.exports = {
  GeneratorFactory,
  Generator: require("./generators/Generator"),
  JavaScriptGenerator: require("./generators/JavaScriptGenerator"),
  WASMGenerator: require("./generators/WASMGenerator").WASMGenerator,
  ZeroCopyWASMGenerator: require("./generators/ZeroCopyWASMGenerator"),
};
