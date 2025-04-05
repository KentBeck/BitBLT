/**
 * Zero-Copy WebAssembly Generator Tests
 * 
 * Tests for the zero-copy WebAssembly generator.
 */

// Import the BitBLT function and utilities
const { 
  bitblt, 
  setGeneratorType, 
  createGenerator 
} = require('../src/bitblt');

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
describe('Zero-Copy WebAssembly Generator', () => {
  test('Create zero-copy WebAssembly generator', () => {
    // Create a zero-copy WebAssembly generator
    const generator = createGenerator('zero-copy-wasm');
    
    // Check that the generator has the correct type
    if (generator.name !== 'zero-copy-wasm') {
      throw new Error(`Expected generator name to be 'zero-copy-wasm', got '${generator.name}'`);
    }
  });
  
  test('Check if zero-copy WebAssembly is supported', () => {
    // Create a zero-copy WebAssembly generator
    const generator = createGenerator('zero-copy-wasm');
    
    // Check if zero-copy WebAssembly is supported
    const isSupported = generator.isSupported();
    
    // Log the result (this is informational, not a pass/fail test)
    console.log(`Zero-copy WebAssembly is ${isSupported ? 'supported' : 'not supported'} in this environment`);
  });
  
  // Only run this test if SharedArrayBuffer is available
  if (typeof SharedArrayBuffer !== 'undefined') {
    test('Execute BitBLT with zero-copy WebAssembly', async () => {
      // Set the generator type to zero-copy WebAssembly
      setGeneratorType('zero-copy-wasm');
      
      // Create source and destination buffers using SharedArrayBuffer
      const width = 32;
      const height = 32;
      const bufferSize = Math.ceil(width * height / 32);
      
      const srcBuffer = new Uint32Array(new SharedArrayBuffer(bufferSize * 4));
      const dstBuffer = new Uint32Array(new SharedArrayBuffer(bufferSize * 4));
      
      // Fill source buffer with a pattern
      createPattern(srcBuffer, width, height, patterns.checkerboard);
      
      // Execute BitBLT
      await bitblt(
        srcBuffer, width, height, 0, 0,
        dstBuffer, width, 0, 0, width, height
      );
      
      // Verify that the destination buffer matches the source buffer
      assertBitBuffersEqual(srcBuffer, dstBuffer, width, height);
    });
    
    test('Execute BitBLT with zero-copy WebAssembly and non-shared buffers', async () => {
      // Set the generator type to zero-copy WebAssembly
      setGeneratorType('zero-copy-wasm');
      
      // Create source and destination buffers using regular ArrayBuffer
      const width = 32;
      const height = 32;
      const bufferSize = Math.ceil(width * height / 32);
      
      const srcBuffer = new Uint32Array(bufferSize);
      const dstBuffer = new Uint32Array(bufferSize);
      
      // Fill source buffer with a pattern
      createPattern(srcBuffer, width, height, patterns.checkerboard);
      
      // Execute BitBLT
      await bitblt(
        srcBuffer, width, height, 0, 0,
        dstBuffer, width, 0, 0, width, height
      );
      
      // Verify that the destination buffer matches the source buffer
      assertBitBuffersEqual(srcBuffer, dstBuffer, width, height);
    });
  }
});

// Run all tests
process.exit(runTests());
