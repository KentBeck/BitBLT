/**
 * BitBLT Compiler Tests
 * 
 * Tests for the BitBLT compiler and the main BitBLT function that uses
 * both the reference and compiled implementations.
 */

// Import the BitBLT implementation
const { bitblt, createTestBuffer, config } = require('../src/bitblt');

// Import our testing framework
const {
  describe,
  test,
  runTests,
  getPixel,
  visualizeBitBuffer,
  compareBitBuffers,
  assertBitBuffersEqual,
  createPattern,
  patterns
} = require('./bitblt-tester');

// Begin tests
describe('BitBLT Compiler', () => {
  test('Reference and compiled implementations produce identical results', () => {
    // Enable verification
    config.verifyResults = true;
    config.useCompiled = true;
    
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
    
    // Perform BitBLT operation
    bitblt(
      srcBuffer, srcWidth, srcHeight,
      0, 0,                    // source x, y
      dstBuffer, dstWidth,     // dest buffer and width
      0, 0,                    // dest x, y
      srcWidth, srcHeight      // width, height
    );
    
    // If we get here without an error, the verification passed
    // Let's assert that the result matches the expected pattern anyway
    assertBitBuffersEqual(
      expectedBuffer, dstBuffer, dstWidth, dstHeight,
      'Full buffer copy should match the source pattern'
    );
  });
  
  test('Reference implementation works correctly when compiled is disabled', () => {
    // Disable compiled implementation
    config.useCompiled = false;
    
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
    
    // Perform BitBLT operation
    bitblt(
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
  
  test('Compiled implementation works correctly when verification is disabled', () => {
    // Enable compiled implementation but disable verification
    config.useCompiled = true;
    config.verifyResults = false;
    
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
    
    // Perform BitBLT operation
    bitblt(
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
});

// Run all tests
process.exit(runTests());
