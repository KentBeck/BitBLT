/**
 * BitBLT Tests
 * 
 * Tests for the BitBLT implementation using our custom testing framework.
 */

// Import the BitBLT implementation
const path = require('path');
const fs = require('fs');
const bitbltPath = path.join(__dirname, '../src/reference/bitblt.js');
const bitbltCode = fs.readFileSync(bitbltPath, 'utf8');

// Extract the bitblt function from the file
// This is a workaround since the function isn't properly exported
const bitbltMatch = bitbltCode.match(/function bitblt\([^{]*\{[^]*?\n\}/);
if (!bitbltMatch) {
  throw new Error('Could not find bitblt function in the source file');
}

// Create a function from the extracted code
const bitblt = new Function(
  'return ' + bitbltMatch[0]
)();

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
describe('BitBLT Basic Operations', () => {
  test('Copy entire buffer', () => {
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
  
  test('Copy a region from source to destination', () => {
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
    
    // Perform BitBLT operation
    bitblt(
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
  
  test('Copy with offset in destination', () => {
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
    
    // Perform BitBLT operation
    bitblt(
      srcBuffer, srcWidth, srcHeight,
      0, 0,                    // source x, y
      dstBuffer, dstWidth,     // dest buffer and width
      2, 2,                    // dest x, y
      4, 4                     // width, height
    );
    
    // Assert that the result matches the expected pattern
    assertBitBuffersEqual(
      expectedBuffer, dstBuffer, dstWidth, dstHeight,
      'Copy with destination offset should match the expected pattern'
    );
  });
});

// Run all tests
process.exit(runTests());
