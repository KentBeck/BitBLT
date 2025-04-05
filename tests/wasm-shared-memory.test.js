/**
 * WebAssembly Shared Memory Tests
 * 
 * Tests for the WebAssembly generator with SharedArrayBuffer.
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
describe('WebAssembly Shared Memory', () => {
  test('Detect SharedArrayBuffer availability', () => {
    // Create a WASM generator
    const generator = new WASMGenerator();
    
    // Check if SharedArrayBuffer is available
    const isAvailable = generator.isSharedArrayBufferAvailable();
    
    // Log the result (this is informational, not a pass/fail test)
    console.log(`SharedArrayBuffer is ${isAvailable ? 'available' : 'not available'} in this environment`);
  });
  
  // Only run this test if SharedArrayBuffer is available
  if (typeof SharedArrayBuffer !== 'undefined') {
    test('Create buffers with SharedArrayBuffer', () => {
      // Create a SharedArrayBuffer
      const sharedBuffer = new SharedArrayBuffer(32 * 4); // 32 Uint32 elements
      
      // Create Uint32Array views of the SharedArrayBuffer
      const srcBuffer = new Uint32Array(sharedBuffer, 0, 16);
      const dstBuffer = new Uint32Array(sharedBuffer, 16 * 4, 16);
      
      // Verify that the buffers use SharedArrayBuffer
      if (!(srcBuffer.buffer instanceof SharedArrayBuffer)) {
        throw new Error('Source buffer does not use SharedArrayBuffer');
      }
      
      if (!(dstBuffer.buffer instanceof SharedArrayBuffer)) {
        throw new Error('Destination buffer does not use SharedArrayBuffer');
      }
      
      // Set some values in the source buffer
      srcBuffer[0] = 0xAAAAAAAA; // 10101010... pattern
      
      // Create a WASM generator
      const generator = new WASMGenerator();
      
      // Check if the generator detects the SharedArrayBuffer
      const canUseZeroCopy = generator.isSharedArrayBufferAvailable() &&
                            (srcBuffer.buffer instanceof SharedArrayBuffer) &&
                            (dstBuffer.buffer instanceof SharedArrayBuffer);
      
      if (!canUseZeroCopy) {
        throw new Error('Generator did not detect SharedArrayBuffer');
      }
    });
    
    test('Execute BitBLT with SharedArrayBuffer', async () => {
      // Skip this test if SharedArrayBuffer is not available
      if (typeof SharedArrayBuffer === 'undefined') {
        console.log('Skipping SharedArrayBuffer test (not available)');
        return;
      }
      
      try {
        // Create a SharedArrayBuffer
        const bufferSize = 8 * 8 / 32; // 8x8 pixels, 32 pixels per Uint32
        const sharedSrcBuffer = new SharedArrayBuffer(bufferSize * 4);
        const sharedDstBuffer = new SharedArrayBuffer(bufferSize * 4);
        
        // Create Uint32Array views of the SharedArrayBuffers
        const srcBuffer = new Uint32Array(sharedSrcBuffer);
        const dstBuffer = new Uint32Array(sharedDstBuffer);
        
        // Create a checkerboard pattern in the source buffer
        createPattern(srcBuffer, 8, 8, patterns.checkerboard);
        
        // Create a WASM generator
        const generator = new WASMGenerator();
        
        // Execute BitBLT with the SharedArrayBuffer
        await generator.execute(
          srcBuffer, 8, 8,
          0, 0,
          dstBuffer, 8,
          0, 0,
          8, 8
        );
        
        // Verify that the destination buffer matches the source buffer
        for (let i = 0; i < bufferSize; i++) {
          if (dstBuffer[i] !== srcBuffer[i]) {
            throw new Error(`Buffer mismatch at index ${i}: expected ${srcBuffer[i]}, got ${dstBuffer[i]}`);
          }
        }
      } catch (err) {
        // If the test fails due to security restrictions, skip it
        if (err.message.includes('cross-origin') || 
            err.message.includes('CORS') ||
            err.message.includes('SharedArrayBuffer')) {
          console.log('Skipping SharedArrayBuffer test due to security restrictions:', err.message);
          return;
        }
        
        throw err;
      }
    });
  }
});

// Run all tests
process.exit(runTests());
