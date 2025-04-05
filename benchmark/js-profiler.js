/**
 * JavaScript Generator Profiler for BitBLT
 *
 * This profiler specifically measures the time spent in code generation
 * versus the time spent executing the generated code for the JavaScript generator.
 */

const { bitblt, setGeneratorType, createGenerator } = require("../src/bitblt");

const {
  createTestBuffer,
  createPattern,
  patterns,
} = require("../tests/bitblt-tester");

// Performance measurement utilities
const { performance } = require("perf_hooks");

/**
 * Run a detailed profile for the JavaScript generator
 */
async function runJavaScriptProfile() {
  console.log("BitBLT JavaScript Generator Profiler");
  console.log("===================================");
  console.log();

  // Test configurations
  const configs = [
    { width: 32, height: 32, name: "Small (32x32)" },
    { width: 128, height: 128, name: "Medium (128x128)" },
    { width: 512, height: 512, name: "Large (512x512)" },
    { width: 1024, height: 1024, name: "XL (1024x1024)" },
    { width: 2048, height: 2048, name: "XXL (2048x2048)" },
  ];

  // Set the generator type to JavaScript
  setGeneratorType("javascript");

  // Disable verification for benchmarking
  const bitbltConfig = require("../src/bitblt").config;
  bitbltConfig.verifyResults = false;

  // Results storage
  const results = [];

  // Run profiles for each configuration
  for (const config of configs) {
    console.log(`\nTesting ${config.name}:`);
    console.log("--------------------------------------------------");

    const { width, height } = config;

    // Create source and destination buffers
    const bufferWidth = width;
    const bufferHeight = height;

    const srcBuffer = createTestBuffer(bufferWidth, bufferHeight);
    const dstBuffer = createTestBuffer(bufferWidth, bufferHeight);

    // Fill source buffer with pattern
    createPattern(srcBuffer, bufferWidth, bufferHeight, patterns.checkerboard);

    // Get the generator instance
    const generator = createGenerator("javascript");

    // Measure generator creation time
    const startGeneratorCreation = performance.now();
    const newGenerator = createGenerator("javascript");
    const generatorCreationTime = performance.now() - startGeneratorCreation;

    // Measure code generation time
    const startCodeGeneration = performance.now();

    // Generate the code
    const generatedCode = generator.generate({
      srcWidth: bufferWidth,
      srcHeight: bufferHeight,
      srcX: 0,
      srcY: 0,
      dstWidth: bufferWidth,
      dstX: 0,
      dstY: 0,
      width,
      height,
    });

    const codeGenerationTime = performance.now() - startCodeGeneration;

    // Measure function creation time (eval/Function constructor)
    const startFunctionCreation = performance.now();

    // Create a function from the generated code
    const bitbltFunction = new Function(
      "srcBuffer",
      "dstBuffer",
      generatedCode
    );

    const functionCreationTime = performance.now() - startFunctionCreation;

    // Measure execution time (multiple iterations for more accurate results)
    // Use a larger number of iterations for more accurate timing
    const iterations = width > 1000 ? 1000 : 10000;

    // Warm up the JIT compiler
    for (let i = 0; i < 100; i++) {
      bitbltFunction(srcBuffer, dstBuffer);
    }

    // Time a batch of iterations instead of individual calls
    const startExecution = performance.now();

    for (let i = 0; i < iterations; i++) {
      bitbltFunction(srcBuffer, dstBuffer);
    }

    const totalExecutionTime = performance.now() - startExecution;
    const avgExecutionTime = totalExecutionTime / iterations;

    // Run a second batch to verify consistency
    const startExecution2 = performance.now();

    for (let i = 0; i < iterations; i++) {
      bitbltFunction(srcBuffer, dstBuffer);
    }

    const totalExecutionTime2 = performance.now() - startExecution2;
    const avgExecutionTime2 = totalExecutionTime2 / iterations;

    // Use the minimum of the two averages
    const minExecutionTime = Math.min(avgExecutionTime, avgExecutionTime2);
    const maxExecutionTime = Math.max(avgExecutionTime, avgExecutionTime2);

    // Use the average of the two runs as our final result
    const finalAvgExecutionTime = (avgExecutionTime + avgExecutionTime2) / 2;

    // Calculate pixels per microsecond
    const totalPixels = width * height;
    const pixelsPerMicrosecond = totalPixels / (finalAvgExecutionTime * 1000);

    // Store results
    const result = {
      config: `${width}x${height}`,
      generatorCreationTime,
      codeGenerationTime,
      functionCreationTime,
      avgExecutionTime: finalAvgExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      totalPixels,
      pixelsPerMicrosecond,
      generationToExecutionRatio: codeGenerationTime / finalAvgExecutionTime,
      codeLength: generatedCode.length,
      iterations,
    };

    results.push(result);

    // Print individual result
    console.log(
      `  Generator creation: ${result.generatorCreationTime.toFixed(2)}ms`
    );
    console.log(`  Code generation: ${result.codeGenerationTime.toFixed(2)}ms`);
    console.log(
      `  Function creation: ${result.functionCreationTime.toFixed(2)}ms`
    );
    console.log(
      `  Execution: ${result.avgExecutionTime.toFixed(
        6
      )}ms (min: ${result.minExecutionTime.toFixed(
        6
      )}ms, max: ${result.maxExecutionTime.toFixed(6)}ms)`
    );
    console.log(`  Iterations: ${result.iterations.toLocaleString()}`);
    console.log(
      `  Generation/Execution ratio: ${result.generationToExecutionRatio.toFixed(
        2
      )}`
    );
    console.log(
      `  Performance: ${result.pixelsPerMicrosecond.toFixed(2)} pixels/μs`
    );
    console.log(`  Generated code length: ${result.codeLength} characters`);
  }

  // Print summary table
  console.log("\n\nJavaScript Generator Performance Summary");
  console.log("=======================================");
  console.log(
    "\n| Configuration | Code Gen | Function | Execution | Gen/Exec | Performance |"
  );
  console.log(
    "|--------------|----------|----------|-----------|---------|-------------|"
  );

  results
    .sort((a, b) => {
      const sizeA = parseInt(a.config.split("x")[0]);
      const sizeB = parseInt(b.config.split("x")[0]);
      return sizeA - sizeB;
    })
    .forEach((result) => {
      console.log(
        `| ${result.config.padEnd(12)} | ` +
          `${result.codeGenerationTime.toFixed(2).padStart(6)}ms | ` +
          `${result.functionCreationTime.toFixed(2).padStart(6)}ms | ` +
          `${result.avgExecutionTime.toFixed(2).padStart(7)}ms | ` +
          `${result.generationToExecutionRatio.toFixed(2).padStart(5)}x | ` +
          `${result.pixelsPerMicrosecond.toFixed(2).padStart(9)} px/μs |`
      );
    });

  console.log(
    "|--------------|----------|----------|-----------|---------|-------------|"
  );

  // Print code size analysis
  console.log("\nGenerated Code Size Analysis:");
  console.log("| Configuration | Code Length | Bytes/Pixel |");
  console.log("|--------------|-------------|-------------|");

  results.forEach((result) => {
    const bytesPerPixel = result.codeLength / result.totalPixels;
    console.log(
      `| ${result.config.padEnd(12)} | ` +
        `${result.codeLength.toString().padStart(9)} | ` +
        `${bytesPerPixel.toFixed(4).padStart(9)} |`
    );
  });

  console.log("|--------------|-------------|-------------|");
}

// Run the JavaScript profile
runJavaScriptProfile().catch((err) => {
  console.error("Error running JavaScript profile:", err);
  process.exit(1);
});
