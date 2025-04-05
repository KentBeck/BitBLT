// Import the bitblt function
const bitblt = function(
    srcBuffer,    // source pixel buffer
    srcWidth,     // width of source buffer
    srcHeight,    // height of source buffer
    srcX,         // x coordinate in source
    srcY,         // y coordinate in source
    dstBuffer,    // destination pixel buffer
    dstWidth,     // width of destination buffer
    dstX,         // x coordinate in destination
    dstY,         // y coordinate in destination
    width,        // width of region to copy
    height        // height of region to copy
) {
    // Iterate through each row
    for (let y = 0; y < height; y++) {
        const srcOffset = (srcY + y) * srcWidth + srcX;
        const dstOffset = (dstY + y) * dstWidth + dstX;
        
        // Copy one row of pixels
        for (let x = 0; x < width; x++) {
            dstBuffer[dstOffset + x] = srcBuffer[srcOffset + x];
        }
    }
};

// Test helper function
function createTestBuffer(width, height, fillValue) {
    return new Uint32Array(width * height).fill(fillValue);
}

// Run the test
function runTest() {
  const srcBuffer = createTestBuffer(8, 8, 1);
  const dstBuffer = createTestBuffer(8, 8, 0);
  
  bitblt(
    srcBuffer, 8, 8,  // source buffer and dimensions
    2, 2,             // source x, y
    dstBuffer, 8,     // destination buffer and width
    0, 0,             // destination x, y
    4, 4              // width and height to copy
  );
  
  // Verify the results
  let passed = true;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const expectedValue = (x < 4 && y < 4) ? 1 : 0;
      if (dstBuffer[y * 8 + x] !== expectedValue) {
        passed = false;
        console.log(`Failed at (${x}, ${y}): expected ${expectedValue}, got ${dstBuffer[y * 8 + x]}`);
      }
    }
  }
  
  return passed;
}

const testResult = runTest();
console.log(testResult ? 'Tests passed!' : 'Tests failed!');
