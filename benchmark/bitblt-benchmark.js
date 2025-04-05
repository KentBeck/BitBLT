/**
 * BitBLT Performance Benchmark
 *
 * This benchmark measures the performance of different BitBLT implementations
 * with various input parameters, reporting results in pixels per microsecond.
 */

const {
  bitblt,
  setGeneratorType,
  createGenerator,
  createTestBuffer,
} = require("../src/bitblt");

// Import patterns for creating test data
const { createPattern, patterns } = require("../tests/bitblt-tester");

// Available generator types
const GENERATOR_TYPES = ["javascript", "wasm"]; // Benchmark both JavaScript and WebAssembly

// Test configurations
const TEST_CONFIGS = [
  // Small buffers
  { width: 32, height: 32, name: "Small (32x32)" },
  // Medium buffers
  { width: 128, height: 128, name: "Medium (128x128)" },
  // Large buffers
  { width: 512, height: 512, name: "Large (512x512)" },
  // Wide buffers
  { width: 1024, height: 64, name: "Wide (1024x64)" },
  // Tall buffers
  { width: 64, height: 1024, name: "Tall (64x1024)" },
  // Word-aligned
  { width: 32, height: 32, srcX: 0, dstX: 0, name: "Word-aligned (32x32)" },
  // Non-aligned
  { width: 32, height: 32, srcX: 3, dstX: 5, name: "Non-aligned (32x32)" },
];

// Test patterns
const TEST_PATTERNS = [
  { pattern: patterns.checkerboard, name: "Checkerboard" },
  { pattern: patterns.horizontal, name: "Horizontal Lines" },
  { pattern: patterns.vertical, name: "Vertical Lines" },
  { pattern: patterns.diagonal, name: "Diagonal Lines" },
];

/**
 * Run a single benchmark test
 *
 * @param {string} generatorType - Type of generator to use
 * @param {Object} config - Test configuration
 * @param {Object} patternInfo - Pattern information
 * @param {number} iterations - Number of iterations to run
 * @returns {Object} - Benchmark results
 */
async function runBenchmark(
  generatorType,
  config,
  patternInfo,
  iterations = 10
) {
  // Set the generator type and disable verification
  setGeneratorType(generatorType);

  // Disable verification for benchmarking
  const bitbltConfig = require("../src/bitblt").config;
  bitbltConfig.verifyResults = false;

  // Create source and destination buffers
  const srcWidth = config.width;
  const srcHeight = config.height;
  const srcX = config.srcX || 0;
  const srcY = config.srcY || 0;
  const dstWidth = config.width;
  const dstX = config.dstX || 0;
  const dstY = config.dstY || 0;
  const width = config.width - Math.max(srcX, dstX);
  const height = config.height - Math.max(srcY, dstY);

  // Calculate buffer sizes (in Uint32 elements)
  const srcBufferSize = Math.ceil((srcWidth * srcHeight) / 32);
  const dstBufferSize = Math.ceil((dstWidth * height) / 32);

  // Create buffers
  const srcBuffer = createTestBuffer(srcWidth, srcHeight, 0);
  const dstBuffer = createTestBuffer(dstWidth, height, 0);

  // Fill source buffer with pattern
  createPattern(srcBuffer, srcWidth, srcHeight, patternInfo.pattern);

  // Warm up
  await bitblt(
    srcBuffer,
    srcWidth,
    srcHeight,
    srcX,
    srcY,
    dstBuffer,
    dstWidth,
    dstX,
    dstY,
    width,
    height
  );

  // Run the benchmark
  const times = [];
  const totalPixels = width * height;

  for (let i = 0; i < iterations; i++) {
    const startTime = process.hrtime.bigint();

    await bitblt(
      srcBuffer,
      srcWidth,
      srcHeight,
      srcX,
      srcY,
      dstBuffer,
      dstWidth,
      dstX,
      dstY,
      width,
      height
    );

    const endTime = process.hrtime.bigint();
    const elapsedNanos = Number(endTime - startTime);
    const elapsedMicros = elapsedNanos / 1000;

    times.push(elapsedMicros);
  }

  // Calculate statistics
  times.sort((a, b) => a - b);

  // Remove outliers (top and bottom 10%)
  const trimmedTimes = times.slice(
    Math.floor(iterations * 0.1),
    Math.ceil(iterations * 0.9)
  );

  const avgTime =
    trimmedTimes.reduce((sum, time) => sum + time, 0) / trimmedTimes.length;
  const minTime = trimmedTimes[0];
  const maxTime = trimmedTimes[trimmedTimes.length - 1];

  // Calculate pixels per microsecond
  const avgPixelsPerMicro = totalPixels / avgTime;
  const maxPixelsPerMicro = totalPixels / minTime;

  return {
    generator: generatorType,
    config: config.name,
    pattern: patternInfo.name,
    totalPixels,
    avgTime,
    minTime,
    maxTime,
    avgPixelsPerMicro,
    maxPixelsPerMicro,
  };
}

/**
 * Format a number with commas
 *
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
function formatNumber(num) {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks() {
  console.log("BitBLT Performance Benchmark");
  console.log("===========================");
  console.log();

  const results = [];
  const iterations = 20;

  // Check if SharedArrayBuffer is available
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  console.log(
    `SharedArrayBuffer is ${
      hasSharedArrayBuffer ? "available" : "not available"
    }`
  );
  console.log();

  // Run benchmarks for each generator type
  for (const generatorType of GENERATOR_TYPES) {
    console.log(`Testing ${generatorType.toUpperCase()} generator...`);

    // Run benchmarks for each configuration
    for (const config of TEST_CONFIGS) {
      // Run benchmarks for each pattern
      for (const patternInfo of TEST_PATTERNS) {
        process.stdout.write(`  ${config.name}, ${patternInfo.name}... `);

        try {
          const result = await runBenchmark(
            generatorType,
            config,
            patternInfo,
            iterations
          );
          results.push(result);

          process.stdout.write(
            `${formatNumber(result.avgPixelsPerMicro)} pixels/μs\n`
          );
        } catch (err) {
          process.stdout.write(`ERROR: ${err.message}\n`);
        }
      }
    }

    console.log();
  }

  // Print results table
  console.log("Results Summary (pixels per microsecond)");
  console.log("=======================================");
  console.log();

  // Print header
  console.log(
    "| Generator | Configuration | Pattern | Avg Pixels/μs | Max Pixels/μs |"
  );
  console.log(
    "|-----------|---------------|---------|---------------|---------------|"
  );

  // Print results
  for (const result of results) {
    console.log(
      `| ${result.generator.padEnd(9)} | ${result.config.padEnd(
        13
      )} | ${result.pattern.padEnd(7)} | ${formatNumber(
        result.avgPixelsPerMicro
      ).padStart(13)} | ${formatNumber(result.maxPixelsPerMicro).padStart(
        13
      )} |`
    );
  }

  console.log();

  // Print comparison between JavaScript and WASM
  console.log("JavaScript vs WebAssembly Comparison");
  console.log("===================================");
  console.log();

  // Group results by configuration and pattern
  const groupedResults = {};

  for (const result of results) {
    const key = `${result.config} - ${result.pattern}`;

    if (!groupedResults[key]) {
      groupedResults[key] = {};
    }

    groupedResults[key][result.generator] = result;
  }

  // Print comparison table
  console.log(
    "| Configuration | Pattern | JS Pixels/μs | WASM Pixels/μs | WASM/JS Ratio |"
  );
  console.log(
    "|---------------|---------|--------------|----------------|---------------|"
  );

  for (const [key, group] of Object.entries(groupedResults)) {
    if (group.javascript && group.wasm) {
      const jsPerf = group.javascript.avgPixelsPerMicro;
      const wasmPerf = group.wasm.avgPixelsPerMicro;
      const ratio = wasmPerf / jsPerf;

      const [config, pattern] = key.split(" - ");

      console.log(
        `| ${config.padEnd(13)} | ${pattern.padEnd(7)} | ${formatNumber(
          jsPerf
        ).padStart(12)} | ${formatNumber(wasmPerf).padStart(
          14
        )} | ${formatNumber(ratio).padStart(13)} |`
      );
    }
  }

  console.log();

  // Print SharedArrayBuffer benchmark if available
  if (hasSharedArrayBuffer) {
    console.log("SharedArrayBuffer Performance Test");
    console.log("=================================");
    console.log();

    // Create buffers using SharedArrayBuffer
    const width = 256;
    const height = 256;
    const bufferSize = Math.ceil((width * height) / 32);

    // Create SharedArrayBuffers
    const sharedSrcBuffer = new SharedArrayBuffer(bufferSize * 4);
    const sharedDstBuffer = new SharedArrayBuffer(bufferSize * 4);

    // Create views
    const srcBuffer = new Uint32Array(sharedSrcBuffer);
    const dstBuffer = new Uint32Array(sharedDstBuffer);

    // Fill source buffer with pattern
    createPattern(srcBuffer, width, height, patterns.checkerboard);

    // Set generator type to WASM
    setGeneratorType("wasm");

    // Run benchmark
    console.log("Running SharedArrayBuffer benchmark...");

    const startTime = process.hrtime.bigint();

    await bitblt(
      srcBuffer,
      width,
      height,
      0,
      0,
      dstBuffer,
      width,
      0,
      0,
      width,
      height
    );

    const endTime = process.hrtime.bigint();
    const elapsedNanos = Number(endTime - startTime);
    const elapsedMicros = elapsedNanos / 1000;

    const totalPixels = width * height;
    const pixelsPerMicro = totalPixels / elapsedMicros;

    console.log(
      `SharedArrayBuffer performance: ${formatNumber(pixelsPerMicro)} pixels/μs`
    );
    console.log();
  }
}

// Run the benchmarks
runAllBenchmarks().catch((err) => {
  console.error("Benchmark error:", err);
  process.exit(1);
});
