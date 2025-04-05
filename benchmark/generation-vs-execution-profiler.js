/**
 * Generation vs Execution Profiler for BitBLT
 *
 * This profiler specifically measures the time spent in code generation
 * versus the time spent executing the generated code.
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
 * Run a profile for a specific generator and configuration
 *
 * @param {string} generatorType - Type of generator to use
 * @param {Object} config - Test configuration
 * @returns {Object} - Profile results
 */
async function runGeneratorProfile(generatorType, config) {
  // Set the generator type
  setGeneratorType(generatorType);

  // Disable verification for benchmarking
  const bitbltConfig = require("../src/bitblt").config;
  bitbltConfig.verifyResults = false;

  // Create source and destination buffers
  const { width, height } = config;
  const bufferWidth = width;
  const bufferHeight = height;

  const srcBuffer = createTestBuffer(bufferWidth, bufferHeight);
  const dstBuffer = createTestBuffer(bufferWidth, bufferHeight);

  // Fill source buffer with pattern
  createPattern(srcBuffer, bufferWidth, bufferHeight, patterns.checkerboard);

  // Measure generator creation time
  const startGeneratorCreation = performance.now();
  const generator = createGenerator(generatorType);
  const generatorCreationTime = performance.now() - startGeneratorCreation;

  // Measure code generation time
  const startCodeGeneration = performance.now();

  // For JavaScript generator, we'll call generate directly
  if (generatorType === "javascript") {
    generator.generate({
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
  }
  // For WASM generators, we'll call compile which includes generation
  else if (generatorType === "wasm" || generatorType === "zero-copy-wasm") {
    // Create a memory object for WebAssembly
    // Calculate required memory size based on image dimensions
    const pixelCount = width * height;
    const bytesNeeded = pixelCount * 4; // 4 bytes per pixel
    const pagesNeeded = Math.ceil(bytesNeeded / 65536) + 1; // 64KB per page, add 1 for safety

    const memory = new WebAssembly.Memory({
      initial: pagesNeeded, // Allocate enough pages for the image
      maximum: Math.max(pagesNeeded, 64), // At least 64 pages (4MB) or what we need
      shared: false, // Don't use shared memory for profiling
    });

    // Create import object with memory
    const importObject = {
      env: { memory },
    };

    await generator.compile(
      {
        srcWidth: bufferWidth,
        srcHeight: bufferHeight,
        srcX: 0,
        srcY: 0,
        dstWidth: bufferWidth,
        dstX: 0,
        dstY: 0,
        width,
        height,
      },
      importObject
    );
  }

  const codeGenerationTime = performance.now() - startCodeGeneration;

  // Measure execution time (multiple iterations for more accurate results)
  const iterations = width > 1000 ? 5 : 20;
  const executionTimes = [];

  for (let i = 0; i < iterations; i++) {
    const startExecution = performance.now();

    await bitblt(
      srcBuffer,
      bufferWidth,
      bufferHeight,
      0,
      0,
      dstBuffer,
      bufferWidth,
      0,
      0,
      width,
      height
    );

    const executionTime = performance.now() - startExecution;
    executionTimes.push(executionTime);
  }

  // Calculate average execution time (excluding outliers)
  executionTimes.sort((a, b) => a - b);
  const trimmedTimes = executionTimes.slice(
    Math.floor(iterations * 0.1),
    Math.ceil(iterations * 0.9)
  );

  const avgExecutionTime =
    trimmedTimes.reduce((sum, time) => sum + time, 0) / trimmedTimes.length;
  const minExecutionTime = trimmedTimes[0];
  const maxExecutionTime = trimmedTimes[trimmedTimes.length - 1];

  // Calculate pixels per microsecond
  const totalPixels = width * height;
  const pixelsPerMicrosecond = totalPixels / (avgExecutionTime * 1000);

  return {
    generatorType,
    config: `${width}x${height}`,
    generatorCreationTime,
    codeGenerationTime,
    avgExecutionTime,
    minExecutionTime,
    maxExecutionTime,
    totalPixels,
    pixelsPerMicrosecond,
    generationToExecutionRatio: codeGenerationTime / avgExecutionTime,
  };
}

/**
 * Run profiles for all generators and configurations
 */
async function runAllProfiles() {
  console.log("BitBLT Generation vs Execution Profiler");
  console.log("======================================");
  console.log();

  // Test configurations
  const configs = [
    { width: 32, height: 32, name: "Small (32x32)" },
    { width: 128, height: 128, name: "Medium (128x128)" },
    { width: 512, height: 512, name: "Large (512x512)" },
    { width: 1024, height: 1024, name: "XL (1024x1024)" },
    { width: 2048, height: 2048, name: "XXL (2048x2048)" },
  ];

  // Generator types
  const generatorTypes = ["javascript", "wasm", "zero-copy-wasm"];

  // Results storage
  const results = [];

  // Run profiles for each generator and configuration
  for (const config of configs) {
    console.log(`\nTesting ${config.name}:`);
    console.log("--------------------------------------------------");

    for (const generatorType of generatorTypes) {
      try {
        console.log(`  ${generatorType}...`);
        const result = await runGeneratorProfile(generatorType, config);
        results.push(result);

        // Print individual result
        console.log(
          `    Generator creation: ${result.generatorCreationTime.toFixed(2)}ms`
        );
        console.log(
          `    Code generation: ${result.codeGenerationTime.toFixed(2)}ms`
        );
        console.log(`    Execution: ${result.avgExecutionTime.toFixed(2)}ms`);
        console.log(
          `    Generation/Execution ratio: ${result.generationToExecutionRatio.toFixed(
            2
          )}`
        );
        console.log(
          `    Performance: ${result.pixelsPerMicrosecond.toFixed(2)} pixels/μs`
        );
      } catch (err) {
        console.error(`    Error: ${err.message}`);
      }
    }
  }

  // Print summary tables
  console.log("\n\nGeneration vs Execution Summary");
  console.log("===============================");

  // Code generation time table
  console.log("\nCode Generation Time (ms):");
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
    configGroups[result.config][result.generatorType] =
      result.codeGenerationTime;
  });

  // Print code generation time table
  Object.keys(configGroups)
    .sort()
    .forEach((config) => {
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

  // Execution time table
  console.log("\nExecution Time (ms):");
  console.log(
    "------------------------------------------------------------------"
  );
  console.log(
    "| Configuration | JavaScript |   WASM   | Zero-Copy | Fastest    |"
  );
  console.log(
    "------------------------------------------------------------------"
  );

  // Group by configuration for execution time
  const execGroups = {};
  results.forEach((result) => {
    if (!execGroups[result.config]) {
      execGroups[result.config] = {};
    }
    execGroups[result.config][result.generatorType] = result.avgExecutionTime;
  });

  // Print execution time table
  Object.keys(execGroups)
    .sort()
    .forEach((config) => {
      const jsTime = execGroups[config]["javascript"]
        ? execGroups[config]["javascript"].toFixed(2).padStart(8)
        : "    N/A ";

      const wasmTime = execGroups[config]["wasm"]
        ? execGroups[config]["wasm"].toFixed(2).padStart(8)
        : "    N/A ";

      const zeroTime = execGroups[config]["zero-copy-wasm"]
        ? execGroups[config]["zero-copy-wasm"].toFixed(2).padStart(8)
        : "    N/A ";

      // Determine fastest
      let fastest = "N/A";
      let fastestTime = Infinity;

      if (
        execGroups[config]["javascript"] &&
        execGroups[config]["javascript"] < fastestTime
      ) {
        fastest = "JavaScript";
        fastestTime = execGroups[config]["javascript"];
      }

      if (
        execGroups[config]["wasm"] &&
        execGroups[config]["wasm"] < fastestTime
      ) {
        fastest = "WASM";
        fastestTime = execGroups[config]["wasm"];
      }

      if (
        execGroups[config]["zero-copy-wasm"] &&
        execGroups[config]["zero-copy-wasm"] < fastestTime
      ) {
        fastest = "Zero-Copy";
        fastestTime = execGroups[config]["zero-copy-wasm"];
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

  // Generation to execution ratio table
  console.log("\nGeneration/Execution Ratio:");
  console.log(
    "------------------------------------------------------------------"
  );
  console.log(
    "| Configuration | JavaScript |   WASM   | Zero-Copy | Best Ratio |"
  );
  console.log(
    "------------------------------------------------------------------"
  );

  // Group by configuration for ratio
  const ratioGroups = {};
  results.forEach((result) => {
    if (!ratioGroups[result.config]) {
      ratioGroups[result.config] = {};
    }
    ratioGroups[result.config][result.generatorType] =
      result.generationToExecutionRatio;
  });

  // Print ratio table
  Object.keys(ratioGroups)
    .sort()
    .forEach((config) => {
      const jsRatio = ratioGroups[config]["javascript"]
        ? ratioGroups[config]["javascript"].toFixed(2).padStart(8)
        : "    N/A ";

      const wasmRatio = ratioGroups[config]["wasm"]
        ? ratioGroups[config]["wasm"].toFixed(2).padStart(8)
        : "    N/A ";

      const zeroRatio = ratioGroups[config]["zero-copy-wasm"]
        ? ratioGroups[config]["zero-copy-wasm"].toFixed(2).padStart(8)
        : "    N/A ";

      // Determine best ratio (lowest)
      let bestRatio = "N/A";
      let lowestRatio = Infinity;

      if (
        ratioGroups[config]["javascript"] &&
        ratioGroups[config]["javascript"] < lowestRatio
      ) {
        bestRatio = "JavaScript";
        lowestRatio = ratioGroups[config]["javascript"];
      }

      if (
        ratioGroups[config]["wasm"] &&
        ratioGroups[config]["wasm"] < lowestRatio
      ) {
        bestRatio = "WASM";
        lowestRatio = ratioGroups[config]["wasm"];
      }

      if (
        ratioGroups[config]["zero-copy-wasm"] &&
        ratioGroups[config]["zero-copy-wasm"] < lowestRatio
      ) {
        bestRatio = "Zero-Copy";
        lowestRatio = ratioGroups[config]["zero-copy-wasm"];
      }

      console.log(
        `| ${config.padEnd(
          13
        )} | ${jsRatio}x | ${wasmRatio}x | ${zeroRatio}x | ${bestRatio.padEnd(
          10
        )} |`
      );
    });

  console.log(
    "------------------------------------------------------------------"
  );

  // Performance table (pixels/μs)
  console.log("\nPerformance (pixels/μs):");
  console.log(
    "------------------------------------------------------------------"
  );
  console.log(
    "| Configuration | JavaScript |   WASM   | Zero-Copy | Fastest    |"
  );
  console.log(
    "------------------------------------------------------------------"
  );

  // Group by configuration for performance
  const perfGroups = {};
  results.forEach((result) => {
    if (!perfGroups[result.config]) {
      perfGroups[result.config] = {};
    }
    perfGroups[result.config][result.generatorType] =
      result.pixelsPerMicrosecond;
  });

  // Print performance table
  Object.keys(perfGroups)
    .sort()
    .forEach((config) => {
      const jsPerf = perfGroups[config]["javascript"]
        ? perfGroups[config]["javascript"].toFixed(2).padStart(8)
        : "    N/A ";

      const wasmPerf = perfGroups[config]["wasm"]
        ? perfGroups[config]["wasm"].toFixed(2).padStart(8)
        : "    N/A ";

      const zeroPerf = perfGroups[config]["zero-copy-wasm"]
        ? perfGroups[config]["zero-copy-wasm"].toFixed(2).padStart(8)
        : "    N/A ";

      // Determine fastest
      let fastest = "N/A";
      let fastestPerf = 0;

      if (
        perfGroups[config]["javascript"] &&
        perfGroups[config]["javascript"] > fastestPerf
      ) {
        fastest = "JavaScript";
        fastestPerf = perfGroups[config]["javascript"];
      }

      if (
        perfGroups[config]["wasm"] &&
        perfGroups[config]["wasm"] > fastestPerf
      ) {
        fastest = "WASM";
        fastestPerf = perfGroups[config]["wasm"];
      }

      if (
        perfGroups[config]["zero-copy-wasm"] &&
        perfGroups[config]["zero-copy-wasm"] > fastestPerf
      ) {
        fastest = "Zero-Copy";
        fastestPerf = perfGroups[config]["zero-copy-wasm"];
      }

      console.log(
        `| ${config.padEnd(
          13
        )} | ${jsPerf} px/μs | ${wasmPerf} px/μs | ${zeroPerf} px/μs | ${fastest.padEnd(
          10
        )} |`
      );
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
