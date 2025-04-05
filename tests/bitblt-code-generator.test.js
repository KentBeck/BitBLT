/**
 * BitBLT Code Generator Tests
 * 
 * Tests for the BitBLT code generator and compiler.
 */

// Import the BitBLT compiler
const { compileBitBLT } = require('../src/compiler/bitblt-compiler');

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
describe('BitBLT Code Generator', () => {
  test('Generate and compile a basic BitBLT function', () => {
    // Compile a basic BitBLT function
    const compiledBitBLT = compileBitBLT({
      debug: true // Enable debug output
    });
    
    // Verify that the function was compiled successfully
    if (typeof compiledBitBLT !== 'function') {
      throw new Error('Failed to compile BitBLT function');
    }
    
    // Create source buffer with a checkerboard pattern
    const srcWidth = 8;
    const srcHeight = 8;
    const srcBuffer = createTestBuffer(srcWidth, srcHeight, 0);
    createPattern(srcBuffer, srcWidth, srcHeight, patterns.checkerboard);
    
    // Create empty destination buffer
    const dstWidth = 8;
    const dstHeight = 8;
    const dstBuffer = createTestBuffer(dstWidth, dstHeight, 0);
    
    // Create expected result (should match source)
    const expectedBuffer = createTestBuffer(dstWidth, dstHeight, 0);
    createPattern(expectedBuffer, dstWidth, dstHeight, patterns.checkerboard);
    
    // Perform BitBLT operation using the compiled function
    compiledBitBLT(
      srcBuffer, srcWidth, srcHeight,
      0, 0,                    // source x, y
      dstBuffer, dstWidth,     // dest buffer and width
      0, 0,                    // dest x, y
      srcWidth, srcHeight      // width, height
    );
    
    // Assert that the result matches the expected pattern
    assertBitBuffersEqual(
      expectedBuffer, dstBuffer, dstWidth, dstHeight,
      'Full buffer copy should match the source pattern'
    );
  });
  
  test('Generate and compile a BitBLT function with constant parameters', () => {
    // Compile a BitBLT function with constant parameters
    const compiledBitBLT = compileBitBLT({
      srcWidth: 8,
      srcHeight: 8,
      dstWidth: 8,
      srcX: 2,
      srcY: 2,
      dstX: 0,
      dstY: 0,
      width: 4,
      height: 4,
      inlineConstants: true,
      debug: true
    });
    
    // Verify that the function was compiled successfully
    if (typeof compiledBitBLT !== 'function') {
      throw new Error('Failed to compile BitBLT function with constant parameters');
    }
    
    // Create source buffer with a checkerboard pattern
    const srcWidth = 8;
    const srcHeight = 8;
    const srcBuffer = createTestBuffer(srcWidth, srcHeight, 0);
    createPattern(srcBuffer, srcWidth, srcHeight, patterns.checkerboard);
    
    // Create empty destination buffer
    const dstWidth = 8;
    const dstHeight = 8;
    const dstBuffer = createTestBuffer(dstWidth, dstHeight, 0);
    
    // Create expected result
    const expectedBuffer = createTestBuffer(dstWidth, dstHeight, 0);
    // Copy a 4x4 region from the checkerboard pattern
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const value = patterns.checkerboard(x + 2, y + 2) ? 1 : 0;
        const widthInUint32 = Math.ceil(dstWidth / 32);
        const elementIndex = Math.floor(x / 32) + y * widthInUint32;
        const bitPos = x % 32;
        
        if (value === 1) {
          expectedBuffer[elementIndex] |= (1 << bitPos);
        }
      }
    }
    
    // Perform BitBLT operation using the compiled function
    compiledBitBLT(
      srcBuffer, srcWidth, srcHeight,
      2, 2,                    // source x, y
      dstBuffer, dstWidth,     // dest buffer and width
      0, 0,                    // dest x, y
      4, 4                     // width, height
    );
    
    // Assert that the result matches the expected pattern
    assertBitBuffersEqual(
      expectedBuffer, dstBuffer, dstWidth, dstHeight,
      'Partial copy should match the expected region'
    );
  });
  
  test('Generate and compile a BitBLT function with unrolled loops', () => {
    // Compile a BitBLT function with unrolled loops
    const compiledBitBLT = compileBitBLT({
      srcWidth: 4,
      srcHeight: 4,
      dstWidth: 8,
      width: 4,
      height: 4,
      unrollLoops: true,
      inlineConstants: true,
      debug: true
    });
    
    // Verify that the function was compiled successfully
    if (typeof compiledBitBLT !== 'function') {
      throw new Error('Failed to compile BitBLT function with unrolled loops');
    }
    
    // Create source buffer with a checkerboard pattern
    const srcWidth = 4;
    const srcHeight = 4;
    const srcBuffer = createTestBuffer(srcWidth, srcHeight, 0);
    createPattern(srcBuffer, srcWidth, srcHeight, patterns.checkerboard);
    
    // Create empty destination buffer
    const dstWidth = 8;
    const dstHeight = 8;
    const dstBuffer = createTestBuffer(dstWidth, dstHeight, 0);
    
    // Create expected result
    const expectedBuffer = createTestBuffer(dstWidth, dstHeight, 0);
    // Copy the 4x4 checkerboard pattern to position (2,2)
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const value = patterns.checkerboard(x, y) ? 1 : 0;
        const widthInUint32 = Math.ceil(dstWidth / 32);
        const elementIndex = Math.floor((x + 2) / 32) + (y + 2) * widthInUint32;
        const bitPos = (x + 2) % 32;
        
        if (value === 1) {
          expectedBuffer[elementIndex] |= (1 << bitPos);
        }
      }
    }
    
    // Perform BitBLT operation using the compiled function
    compiledBitBLT(
      srcBuffer, srcWidth, srcHeight,
      0, 0,                    // source x, y
      dstBuffer, dstWidth,     // dest buffer and width
      2, 2,                    // dest x, y
      4, 4                     // width, height
    );
    
    // Assert that the result matches the expected pattern
    assertBitBuffersEqual(
      expectedBuffer, dstBuffer, dstWidth, dstHeight,
      'Copy with unrolled loops should match the expected pattern'
    );
  });
});

// Run all tests
process.exit(runTests());
