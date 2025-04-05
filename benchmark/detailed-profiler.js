/**
 * Detailed Performance Profiler for BitBLT
 *
 * This script instruments the BitBLT implementation to provide detailed performance metrics.
 */

const { bitblt, setGeneratorType, createGenerator } = require("../src/bitblt");

const {
  createTestBuffer,
  createPattern,
  patterns,
} = require("../tests/bitblt-tester");

// Import the generator classes
const JavaScriptGenerator = require("../src/compiler/generators/JavaScriptGenerator");
const { WASMGenerator } = require("../src/compiler/generators/WASMGenerator");
const ZeroCopyWASMGenerator = require("../src/compiler/generators/ZeroCopyWASMGenerator");

// Performance measurement utilities
const { performance } = require("perf_hooks");

/**
 * Run a detailed performance profile
 */
async function runDetailedProfile() {
  console.log("BitBLT Detailed Performance Profile");
  console.log("==================================");
  console.log();

  // Test configurations
  const configs = [
    { width: 32, height: 32, name: "Small (32x32)" },
    { width: 512, height: 512, name: "Large (512x512)" },
    { width: 2048, height: 2048, name: "XXL (2048x2048)" },
    { width: 32, height: 32, srcX: 3, dstX: 5, name: "Non-aligned (32x32)" },
  ];

  // Generator types
  const generatorTypes = ["javascript", "wasm", "zero-copy-wasm"];

  // Results storage
  const results = [];

  // Run tests for each configuration and generator
  for (const config of configs) {
    console.log(`\nTesting ${config.name}:`);
    console.log("--------------------------------------------------");

    for (const generatorType of generatorTypes) {
      // Set up the generator
      setGeneratorType(generatorType);
      const generator = createGenerator(generatorType);

      // Create buffers
      const { width, height, srcX = 0, srcY = 0, dstX = 0, dstY = 0 } = config;
      const bufferWidth = Math.max(width + Math.max(srcX, dstX), width * 2);
      const bufferHeight = Math.max(height + Math.max(srcY, dstY), height * 2);

      const srcBuffer = createTestBuffer(bufferWidth, bufferHeight);
      const dstBuffer = createTestBuffer(bufferWidth, bufferHeight);

      // Fill source buffer with pattern
      createPattern(
        srcBuffer,
        bufferWidth,
        bufferHeight,
        patterns.checkerboard
      );

      // Disable verification for benchmarking
      const bitbltConfig = require("../src/bitblt").config;
      bitbltConfig.verifyResults = false;

      try {
        console.log(`\n${generatorType.toUpperCase()}:`);

        // Instrument the generator
        const metrics = await instrumentGenerator(
          generator,
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

        // Store results
        results.push({
          config: config.name,
          generator: generatorType,
          metrics,
        });

        // Print metrics
        printMetrics(metrics);
      } catch (err) {
        console.error(`Error with ${generatorType}: ${err.message}`);
      }
    }
  }

  // Print summary
  console.log("\n\nPerformance Summary");
  console.log("==================");

  console.log("\nTotal execution time (ms):");
  console.log(
    "------------------------------------------------------------------"
  );
  console.log(
    "| Configuration | JavaScript |   WASM   | Zero-Copy | Fastest    |"
  );
  console.log(
    "------------------------------------------------------------------"
  );

  // Group by configuration
  const configGroups = {};
  results.forEach((result) => {
    if (!configGroups[result.config]) {
      configGroups[result.config] = {};
    }
    configGroups[result.config][result.generator] = result.metrics.totalTime;
  });

  // Print summary table
  Object.keys(configGroups).forEach((config) => {
    const jsTime = configGroups[config]["javascript"]
      ? configGroups[config]["javascript"].toFixed(2).padStart(8)
      : "    N/A ";

    const wasmTime = configGroups[config]["wasm"]
      ? configGroups[config]["wasm"].toFixed(2).padStart(8)
      : "    N/A ";

    const zeroTime = configGroups[config]["zero-copy-wasm"]
      ? configGroups[config]["zero-copy-wasm"].toFixed(2).padStart(8)
      : "    N/A ";

    // Determine fastest
    let fastest = "N/A";
    let fastestTime = Infinity;

    if (
      configGroups[config]["javascript"] &&
      configGroups[config]["javascript"] < fastestTime
    ) {
      fastest = "JavaScript";
      fastestTime = configGroups[config]["javascript"];
    }

    if (
      configGroups[config]["wasm"] &&
      configGroups[config]["wasm"] < fastestTime
    ) {
      fastest = "WASM";
      fastestTime = configGroups[config]["wasm"];
    }

    if (
      configGroups[config]["zero-copy-wasm"] &&
      configGroups[config]["zero-copy-wasm"] < fastestTime
    ) {
      fastest = "Zero-Copy";
      fastestTime = configGroups[config]["zero-copy-wasm"];
    }

    console.log(
      `| ${config.padEnd(
        13
      )} | ${jsTime}ms | ${wasmTime}ms | ${zeroTime}ms | ${fastest.padEnd(
        10
      )} |`
    );
  });

  console.log(
    "------------------------------------------------------------------"
  );
}

/**
 * Instrument a generator to collect detailed performance metrics
 */
async function instrumentGenerator(
  generator,
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
) {
  const metrics = {
    totalTime: 0,
    compilation: 0,
    execution: 0,
    memoryOperations: 0,
    pixelOperations: 0,
    pixelsPerMicrosecond: 0,
    details: {},
  };

  // Measure total time
  const startTotal = performance.now();

  if (generator instanceof JavaScriptGenerator) {
    // Instrument JavaScript generator
    const originalGenerate = generator.generate;
    const originalExecute = generator.execute;

    // Instrument generate method
    generator.generate = function (...args) {
      const start = performance.now();
      const result = originalGenerate.apply(this, args);
      metrics.compilation = performance.now() - start;
      return result;
    };

    // Instrument execute method
    generator.execute = async function (...args) {
      const start = performance.now();
      const result = await originalExecute.apply(this, args);
      metrics.execution = performance.now() - start;
      return result;
    };

    // Execute BitBLT
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

    // If execution time is 0, run it again with more iterations for better measurement
    if (metrics.execution < 0.1) {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
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
      }

      metrics.execution = (performance.now() - start) / iterations;
    }

    // Restore original methods
    generator.generate = originalGenerate;
    generator.execute = originalExecute;
  } else if (generator instanceof WASMGenerator) {
    // Instrument WebAssembly generator
    const originalGenerate = generator.generate;
    const originalCompile = generator.compile;
    const originalExecuteWithCopy = generator.executeWithCopy;

    // Instrument generate method
    generator.generate = function (...args) {
      const start = performance.now();
      const result = originalGenerate.apply(this, args);
      metrics.details.wasmGeneration = performance.now() - start;
      return result;
    };

    // Instrument compile method
    generator.compile = async function (...args) {
      const start = performance.now();
      const result = await originalCompile.apply(this, args);
      metrics.compilation = performance.now() - start;
      return result;
    };

    // Instrument executeWithCopy method
    generator.executeWithCopy = async function (...args) {
      const startExec = performance.now();

      // Measure memory copy operations
      const originalSet = Uint32Array.prototype.set;
      let copyTime = 0;

      Uint32Array.prototype.set = function (...setArgs) {
        const startCopy = performance.now();
        const result = originalSet.apply(this, setArgs);
        copyTime += performance.now() - startCopy;
        return result;
      };

      try {
        const result = await originalExecuteWithCopy.apply(this, args);
        metrics.execution = performance.now() - startExec;
        metrics.memoryOperations = copyTime;
        return result;
      } finally {
        // Restore original method
        Uint32Array.prototype.set = originalSet;
      }
    };

    // Execute BitBLT
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

    // If execution time is 0, run it again with more iterations for better measurement
    if (metrics.execution < 0.1) {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
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
      }

      metrics.execution = (performance.now() - start) / iterations;
    }

    // Restore original methods
    generator.generate = originalGenerate;
    generator.compile = originalCompile;
    generator.executeWithCopy = originalExecuteWithCopy;
  } else if (generator instanceof ZeroCopyWASMGenerator) {
    // Instrument Zero-Copy WebAssembly generator
    const originalGenerate = generator.generate;
    const originalCompile = generator.compile;
    const originalExecuteWithSharedBuffers = generator.executeWithSharedBuffers;

    // Instrument generate method
    generator.generate = function (...args) {
      const start = performance.now();
      const result = originalGenerate.apply(this, args);
      metrics.details.wasmGeneration = performance.now() - start;
      return result;
    };

    // Instrument compile method
    generator.compile = async function (...args) {
      const start = performance.now();
      const result = await originalCompile.apply(this, args);
      metrics.compilation = performance.now() - start;
      return result;
    };

    // Instrument executeWithSharedBuffers method
    generator.executeWithSharedBuffers = async function (...args) {
      const startExec = performance.now();
      const result = await originalExecuteWithSharedBuffers.apply(this, args);
      metrics.execution = performance.now() - startExec;
      return result;
    };

    // Execute BitBLT
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

    // If execution time is 0, run it again with more iterations for better measurement
    if (metrics.execution < 0.1) {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
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
      }

      metrics.execution = (performance.now() - start) / iterations;
    }

    // Restore original methods
    generator.generate = originalGenerate;
    generator.compile = originalCompile;
    generator.executeWithSharedBuffers = originalExecuteWithSharedBuffers;
  }

  // Calculate total time and pixels per microsecond
  metrics.totalTime = performance.now() - startTotal;
  const totalPixels = width * height;
  metrics.pixelOperations = totalPixels;
  metrics.pixelsPerMicrosecond = totalPixels / (metrics.execution * 1000);

  return metrics;
}

/**
 * Print performance metrics
 */
function printMetrics(metrics) {
  console.log(`  Total time: ${metrics.totalTime.toFixed(2)}ms`);
  console.log(`  Compilation: ${metrics.compilation.toFixed(2)}ms`);
  console.log(`  Execution: ${metrics.execution.toFixed(2)}ms`);

  if (metrics.memoryOperations > 0) {
    console.log(
      `  Memory operations: ${metrics.memoryOperations.toFixed(2)}ms`
    );
  }

  console.log(
    `  Pixels processed: ${metrics.pixelOperations.toLocaleString()}`
  );
  console.log(
    `  Performance: ${metrics.pixelsPerMicrosecond.toFixed(2)} pixels/μs`
  );

  if (Object.keys(metrics.details).length > 0) {
    console.log("  Details:");
    Object.entries(metrics.details).forEach(([key, value]) => {
      console.log(`    ${key}: ${value.toFixed(2)}ms`);
    });
  }
}

// Run the detailed profile
runDetailedProfile().catch((err) => {
  console.error("Error running detailed profile:", err);
  process.exit(1);
});
