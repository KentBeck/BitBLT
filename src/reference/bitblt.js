function bitblt(
  srcBuffer, // source pixel buffer (Uint32Array with 32 pixels per element)
  srcWidth, // width of source buffer in pixels (not Uint32 elements)
  srcHeight, // height of source buffer
  srcX, // x coordinate in source
  srcY, // y coordinate in source
  dstBuffer, // destination pixel buffer (Uint32Array with 32 pixels per element)
  dstWidth, // width of destination buffer in pixels (not Uint32 elements)
  dstX, // x coordinate in destination
  dstY, // y coordinate in destination
  width, // width of region to copy in pixels
  height // height of region to copy in pixels
) {
  // Calculate width in Uint32 elements (32 bits per element)
  const srcWidthInUint32 = Math.ceil(srcWidth / 32);
  const dstWidthInUint32 = Math.ceil(dstWidth / 32);

  // Iterate through each row
  for (let y = 0; y < height; y++) {
    // Calculate the y-position in the source and destination
    const srcYPos = srcY + y;
    const dstYPos = dstY + y;

    // Process each pixel in the row
    for (let x = 0; x < width; x++) {
      // Calculate the x-position in the source and destination
      const srcXPos = srcX + x;
      const dstXPos = dstX + x;

      // Calculate which Uint32 element contains the pixel
      const srcElementIndex =
        Math.floor(srcXPos / 32) + srcYPos * srcWidthInUint32;
      const dstElementIndex =
        Math.floor(dstXPos / 32) + dstYPos * dstWidthInUint32;

      // Calculate the bit position within the Uint32 element (0-31)
      const srcBitPos = srcXPos % 32;
      const dstBitPos = dstXPos % 32;

      // Extract the bit from the source
      const srcBit = (srcBuffer[srcElementIndex] >>> srcBitPos) & 1;

      // Clear the destination bit and set it to the source bit value
      if (srcBit === 1) {
        // Set the bit
        dstBuffer[dstElementIndex] |= 1 << dstBitPos;
      } else {
        // Clear the bit
        dstBuffer[dstElementIndex] &= ~(1 << dstBitPos);
      }
    }
  }
}

// Test helper function for packed pixels (32 pixels per Uint32)
function createTestBuffer(width, height, fillValue) {
  // Calculate how many Uint32 elements we need for the given width
  const widthInUint32 = Math.ceil(width / 32);
  // Create the buffer
  const buffer = new Uint32Array(widthInUint32 * height);

  // Fill with the specified value (all bits 0 or all bits 1)
  if (fillValue === 1) {
    // Fill with all 1s (0xFFFFFFFF)
    buffer.fill(0xffffffff);
  } else {
    // Fill with all 0s
    buffer.fill(0);
  }

  return buffer;
}

// Example usage
function test() {
  // Create 8x8 pixel buffers (packed into Uint32 elements)
  const srcBuffer = createTestBuffer(8, 8, 1); // All bits set to 1
  const dstBuffer = createTestBuffer(8, 8, 0); // All bits set to 0

  // Copy a 4x4 region from position (2,2) in source to (0,0) in destination
  bitblt(
    srcBuffer,
    8, // source width in pixels
    8, // source height
    2, // source x
    2, // source y
    dstBuffer,
    8, // destination width in pixels
    0, // destination x
    0, // destination y
    4, // width to copy
    4 // height to copy
  );

  return dstBuffer;
}
