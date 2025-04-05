/**
 * BitBLT Performance Profiling
 *
 * This script profiles the BitBLT implementation to identify performance bottlenecks.
 */

const { bitblt, setGeneratorType, createGenerator } = require("../src/bitblt");

const {
  createTestBuffer,
  createPattern,
  patterns,
} = require("../tests/bitblt-tester");

const {
  startProfiling,
  stopProfiling,
  printProfile,
  profileClass,
} = require("./profiler");

// Available generator types
const GENERATOR_TYPES = ["javascript", "wasm", "zero-copy-wasm"];

// Test configurations
const TEST_CONFIGS = [
  // Small buffer
  { width: 32, height: 32, name: "Small (32x32)" },
  // Medium buffer
  { width: 128, height: 128, name: "Medium (128x128)" },
  // Large buffer
  { width: 512, height: 512, name: "Large (512x512)" },
  // XL buffer
  { width: 1024, height: 1024, name: "XL (1024x1024)" },
  // Non-aligned
  { width: 32, height: 32, srcX: 3, dstX: 5, name: "Non-aligned (32x32)" },
];

// Test patterns
const TEST_PATTERNS = [
  {
    name: "Checkerboard",
    pattern: patterns.checkerboard,
    patternFn: patterns.checkerboard,
  },
  {
    name: "Horizontal Lines",
    pattern: patterns.horizontalLines,
    patternFn: patterns.horizontalLines,
  },
];

/**
 * Run a profiled benchmark for a specific configuration
 *
 * @param {string} generatorType - Type of generator to use
 * @param {Object} config - Test configuration
 * @param {Object} patternInfo - Pattern information
 * @returns {Promise<Object>} - Benchmark results
 */
async function runProfiledBenchmark(generatorType, config, patternInfo) {
  // Set the generator type
  setGeneratorType(generatorType);

  // Disable verification for benchmarking
  const bitbltConfig = require("../src/bitblt").config;
  bitbltConfig.verifyResults = false;

  // Get the generator instance
  const generator = createGenerator(generatorType);

  // Profile the generator
  profileClass(generator, generatorType, ["analyzeOperation"]);

  // Create source and destination buffers
  const { width, height, srcX = 0, srcY = 0, dstX = 0, dstY = 0 } = config;
  const bufferWidth = Math.max(width + Math.max(srcX, dstX), width * 2);
  const bufferHeight = Math.max(height + Math.max(srcY, dstY), height * 2);

  const srcBuffer = createTestBuffer(bufferWidth, bufferHeight);
  const dstBuffer = createTestBuffer(bufferWidth, bufferHeight);

  // Fill source buffer with pattern
  createPattern(srcBuffer, bufferWidth, bufferHeight, patternInfo.pattern);

  // Start profiling
  startProfiling(`${generatorType}-${config.name}-${patternInfo.name}`);

  // Run the operation
  await bitblt(
    srcBuffer,
    bufferWidth,
    bufferHeight,
    srcX,
    srcY,
    dstBuffer,
    bufferWidth,
    dstX,
    dstY,
    width,
    height
  );

  // Stop profiling and get results
  const profile = stopProfiling();

  return profile;
}

/**
 * Run all profiled benchmarks
 */
async function runAllProfiles() {
  console.log("BitBLT Performance Profiling");
  console.log("===========================");
  console.log();

  const profiles = [];

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
    console.log(`Profiling ${generatorType.toUpperCase()} generator...`);

    // Run benchmarks for each configuration
    for (const config of TEST_CONFIGS) {
      // Run benchmarks for each pattern
      for (const patternInfo of TEST_PATTERNS) {
        process.stdout.write(`  ${config.name}, ${patternInfo.name}... `);

        try {
          const profile = await runProfiledBenchmark(
            generatorType,
            config,
            patternInfo
          );

          profiles.push(profile);
          process.stdout.write(`done (${profile.totalTime.toFixed(2)}ms)\n`);
        } catch (err) {
          process.stdout.write(`ERROR: ${err.message}\n`);
        }
      }
    }

    console.log();
  }

  // Print all profiles
  console.log("\nDetailed Performance Profiles");
  console.log("============================");

  profiles.forEach((profile) => {
    printProfile(profile);
  });

  // Print summary
  console.log("\nPerformance Summary");
  console.log("==================");

  // Group by configuration and generator
  const summary = {};

  profiles.forEach((profile) => {
    const parts = profile.name.split("-");
    const generator = parts[0];
    const pattern = parts[parts.length - 1];
    // Join the middle parts in case the config name has hyphens
    const config = parts.slice(1, parts.length - 1).join("-");

    if (!summary[config]) {
      summary[config] = {};
    }

    if (!summary[config][generator]) {
      summary[config][generator] = {};
    }

    summary[config][generator][pattern] = profile.totalTime;
  });

  // Print summary table
  console.log("\nTotal execution time (ms):");
  console.log(
    "------------------------------------------------------------------"
  );
  console.log(
    "| Configuration | Pattern          | JavaScript |   WASM   | Zero-Copy |"
  );
  console.log(
    "------------------------------------------------------------------"
  );

  Object.keys(summary).forEach((config) => {
    Object.keys(summary[config]["javascript"]).forEach((pattern) => {
      const jsTime = summary[config]["javascript"][pattern]
        .toFixed(2)
        .padStart(8);
      const wasmTime =
        summary[config]["wasm"] && summary[config]["wasm"][pattern]
          ? summary[config]["wasm"][pattern].toFixed(2).padStart(8)
          : "    N/A ";
      const zeroTime =
        summary[config]["zero-copy-wasm"] &&
        summary[config]["zero-copy-wasm"][pattern]
          ? summary[config]["zero-copy-wasm"][pattern].toFixed(2).padStart(8)
          : "    N/A ";

      console.log(
        `| ${config.padEnd(13)} | ${pattern.padEnd(
          16
        )} | ${jsTime}ms | ${wasmTime}ms | ${zeroTime}ms |`
      );
    });
  });

  console.log(
    "------------------------------------------------------------------"
  );

  // Print hotspot summary
  console.log("\nTop Performance Hotspots:");
  console.log(
    "------------------------------------------------------------------"
  );
  console.log(
    "| Generator    | Configuration | Top Hotspot                     |   % Time |"
  );
  console.log(
    "------------------------------------------------------------------"
  );

  profiles.forEach((profile) => {
    const [generator, config, pattern] = profile.name.split("-");

    if (profile.operations.length > 0) {
      const hotspot = profile.operations[0];
      const hotspotName = hotspot.name.padEnd(30).substring(0, 30);
      const percentage = hotspot.percentage.toFixed(1).padStart(8);

      console.log(
        `| ${generator.padEnd(12)} | ${config.padEnd(
          13
        )} | ${hotspotName} | ${percentage}% |`
      );
    }
  });

  console.log(
    "------------------------------------------------------------------"
  );
}

// Run all profiles
runAllProfiles().catch((err) => {
  console.error("Error running profiles:", err);
  process.exit(1);
});
