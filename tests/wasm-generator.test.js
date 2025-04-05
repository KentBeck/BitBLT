/**
 * WebAssembly Generator Tests
 * 
 * Tests for the WebAssembly generator implementation.
 */

// Import the WASM generator
const { WASMGenerator } = require('../src/compiler');

// Import our testing framework
const {
  describe,
  test,
  runTests,
  getPixel,
  visualizeBitBuffer,
  compareBitBuffers,
  assertBitBuffersEqual,
  createTestBuffer,
  createPattern,
  patterns
} = require('./bitblt-tester');

// Begin tests
describe('WebAssembly Generator', () => {
  test('Generate WebAssembly binary module', () => {
    // Create a WASM generator
    const generator = new WASMGenerator();
    
    // Generate a WASM module
    const wasmBinary = generator.generate({
      srcWidth: 8,
      srcHeight: 8,
      dstWidth: 8
    });
    
    // Verify that we got a non-empty binary
    if (!(wasmBinary instanceof Uint8Array)) {
      throw new Error('Generated WASM is not a Uint8Array');
    }
    
    if (wasmBinary.length === 0) {
      throw new Error('Generated WASM binary is empty');
    }
    
    // Check for WASM magic number
    const magicNumber = new Uint8Array([0x00, 0x61, 0x73, 0x6d]);
    for (let i = 0; i < 4; i++) {
      if (wasmBinary[i] !== magicNumber[i]) {
        throw new Error('Generated WASM binary does not have the correct magic number');
      }
    }
  });
  
  test('Get cache key for different parameters', () => {
    // Create a WASM generator
    const generator = new WASMGenerator();
    
    // Get cache keys for different parameters
    const key1 = generator.getCacheKey({
      srcWidth: 8,
      srcHeight: 8,
      dstWidth: 8
    });
    
    const key2 = generator.getCacheKey({
      srcWidth: 16,
      srcHeight: 16,
      dstWidth: 16
    });
    
    // Verify that the keys are different
    if (key1 === key2) {
      throw new Error('Cache keys for different parameters should be different');
    }
    
    // Verify that the keys are consistent
    const key1Again = generator.getCacheKey({
      srcWidth: 8,
      srcHeight: 8,
      dstWidth: 8
    });
    
    if (key1 !== key1Again) {
      throw new Error('Cache keys for the same parameters should be the same');
    }
  });
  
  // Only run this test if WebAssembly is supported
  if (typeof WebAssembly !== 'undefined') {
    test('Compile WebAssembly module', async () => {
      // Create a WASM generator
      const generator = new WASMGenerator();
      
      try {
        // Compile a WASM module
        const bitbltFunction = await generator.compile({
          srcWidth: 8,
          srcHeight: 8,
          dstWidth: 8
        });
        
        // Verify that we got a function
        if (typeof bitbltFunction !== 'function') {
          throw new Error('Compiled WASM did not return a function');
        }
      } catch (err) {
        // If compilation fails due to browser security restrictions, skip the test
        if (err.message.includes('cross-origin') || err.message.includes('CORS')) {
          console.log('Skipping WASM compilation test due to browser security restrictions');
          return;
        }
        
        throw err;
      }
    });
  }
});

// Run all tests
process.exit(runTests());
