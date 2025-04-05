/**
 * BitBLT Generators Tests
 *
 * Tests for the BitBLT module with different generators.
 */

// Import the BitBLT module
const {
  bitblt,
  config,
  setGeneratorType,
  createGenerator,
  createTestBuffer,
} = require("../src/bitblt");

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
  patterns,
} = require("./bitblt-tester");

// Begin tests
describe("BitBLT with Different Generators", () => {
  test("BitBLT with JavaScript generator", () => {
    // Set the generator type to JavaScript
    setGeneratorType("javascript");

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
    const result = bitblt(
      srcBuffer,
      srcWidth,
      srcHeight,
      0,
      0, // source x, y
      dstBuffer,
      dstWidth, // dest buffer and width
      0,
      0, // dest x, y
      srcWidth,
      srcHeight // width, height
    );

    // Handle both synchronous and asynchronous results
    if (result instanceof Promise) {
      throw new Error("JavaScript generator should be synchronous");
    }

    // Assert that the result matches the expected pattern
    assertBitBuffersEqual(
      expectedBuffer,
      dstBuffer,
      dstWidth,
      dstHeight,
      "Full buffer copy should match the source pattern"
    );
  });

  // Only run this test if WebAssembly is supported
  if (typeof WebAssembly !== "undefined") {
    test("BitBLT with WebAssembly generator", async () => {
      try {
        // Set the generator type to WebAssembly
        setGeneratorType("wasm");

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
        createPattern(
          expectedBuffer,
          dstWidth,
          dstHeight,
          patterns.checkerboard
        );

        // Perform BitBLT operation
        await bitblt(
          srcBuffer,
          srcWidth,
          srcHeight,
          0,
          0, // source x, y
          dstBuffer,
          dstWidth, // dest buffer and width
          0,
          0, // dest x, y
          srcWidth,
          srcHeight, // width, height
          { verifyResults: true } // Verify against reference implementation
        );

        // Assert that the result matches the expected pattern
        assertBitBuffersEqual(
          expectedBuffer,
          dstBuffer,
          dstWidth,
          dstHeight,
          "Full buffer copy should match the source pattern"
        );
      } catch (err) {
        // If WASM execution fails due to browser security restrictions, skip the test
        if (
          err.message.includes("cross-origin") ||
          err.message.includes("CORS")
        ) {
          console.log(
            "Skipping WASM execution test due to browser security restrictions"
          );
          return;
        }

        throw err;
      }
    });
  }

  test("Create custom generator", () => {
    // Create a custom generator
    const generator = createGenerator("javascript", {
      unrollLoops: true,
      inlineConstants: true,
    });

    // Verify that the generator was created
    if (!generator) {
      throw new Error("Failed to create custom generator");
    }

    // Verify that the generator has the required methods
    const requiredMethods = ["generate", "compile", "execute"];

    for (const method of requiredMethods) {
      if (typeof generator[method] !== "function") {
        throw new Error(`Generator is missing required method: ${method}`);
      }
    }
  });
});

// Run all tests
process.exit(runTests());
