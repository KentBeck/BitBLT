/**
 * Generator Interface Tests
 * 
 * Tests for the BitBLT generator interface and factory.
 */

// Import the compiler infrastructure
const { GeneratorFactory, Generator } = require('../src/compiler');

// Import our testing framework
const {
  describe,
  test,
  runTests
} = require('./bitblt-tester');

// Begin tests
describe('Generator Interface', () => {
  test('GeneratorFactory creates JavaScript generator', () => {
    const generator = GeneratorFactory.createGenerator('javascript');
    
    if (!(generator instanceof Generator)) {
      throw new Error('Generator is not an instance of Generator base class');
    }
    
    // Check that the generator has the required methods
    const requiredMethods = ['generate', 'compile', 'execute', 'getCacheKey', 'analyzeOperation', 'clearCache'];
    
    for (const method of requiredMethods) {
      if (typeof generator[method] !== 'function') {
        throw new Error(`Generator is missing required method: ${method}`);
      }
    }
  });
  
  test('GeneratorFactory creates WASM generator', () => {
    const generator = GeneratorFactory.createGenerator('wasm');
    
    if (!(generator instanceof Generator)) {
      throw new Error('Generator is not an instance of Generator base class');
    }
    
    // Check that the generator has the required methods
    const requiredMethods = ['generate', 'compile', 'execute', 'getCacheKey', 'analyzeOperation', 'clearCache'];
    
    for (const method of requiredMethods) {
      if (typeof generator[method] !== 'function') {
        throw new Error(`Generator is missing required method: ${method}`);
      }
    }
  });
  
  test('GeneratorFactory throws error for unknown generator type', () => {
    try {
      GeneratorFactory.createGenerator('unknown');
      throw new Error('Expected error was not thrown');
    } catch (err) {
      if (!err.message.includes('Unknown generator type')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
  });
});

// Run all tests
process.exit(runTests());
