/**
 * Simple Performance Profiler for BitBLT
 * 
 * This script provides a simplified performance profile of BitBLT operations.
 */

const { 
  bitblt, 
  setGeneratorType, 
  createGenerator 
} = require('../src/bitblt');

const { 
  createTestBuffer, 
  createPattern, 
  patterns 
} = require('../tests/bitblt-tester');

// Performance measurement utilities
const { performance } = require('perf_hooks');

/**
 * Run a simple performance profile
 */
async function runSimpleProfile() {
  console.log('BitBLT Simple Performance Profile');
  console.log('================================');
  console.log();
  
  // Test configurations
  const configs = [
    { width: 32, height: 32, name: "Small (32x32)" },
    { width: 512, height: 512, name: "Large (512x512)" },
    { width: 2048, height: 2048, name: "XXL (2048x2048)" },
  ];
  
  // Generator types
  const generatorTypes = ['javascript', 'wasm', 'zero-copy-wasm'];
  
  // Results storage
  const results = [];
  
  // Run tests for each configuration and generator
  for (const config of configs) {
    console.log(`\nTesting ${config.name}:`);
    console.log('--------------------------------------------------');
    
    for (const generatorType of generatorTypes) {
      try {
        // Set up the generator
        setGeneratorType(generatorType);
        
        // Create buffers
        const { width, height } = config;
        const bufferWidth = width;
        const bufferHeight = height;
        
        const srcBuffer = createTestBuffer(bufferWidth, bufferHeight);
        const dstBuffer = createTestBuffer(bufferWidth, bufferHeight);
        
        // Fill source buffer with pattern
        createPattern(srcBuffer, bufferWidth, bufferHeight, patterns.checkerboard);
        
        // Disable verification for benchmarking
        const bitbltConfig = require("../src/bitblt").config;
        bitbltConfig.verifyResults = false;
        
        console.log(`\n${generatorType.toUpperCase()}:`);
        
        // Measure compilation time
        const startCompile = performance.now();
        const generator = createGenerator(generatorType);
        const compilationTime = performance.now() - startCompile;
        
        // Warm up
        await bitblt(
          srcBuffer, bufferWidth, bufferHeight, 0, 0,
          dstBuffer, bufferWidth, 0, 0, width, height
        );
        
        // Measure execution time (multiple iterations for more accurate results)
        const iterations = width > 1000 ? 5 : 20;
        const startExec = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          await bitblt(
            srcBuffer, bufferWidth, bufferHeight, 0, 0,
            dstBuffer, bufferWidth, 0, 0, width, height
          );
        }
        
        const executionTime = (performance.now() - startExec) / iterations;
        const totalPixels = width * height;
        const pixelsPerMicrosecond = totalPixels / (executionTime * 1000);
        
        // Store results
        results.push({
          config: config.name,
          generator: generatorType,
          compilationTime,
          executionTime,
          totalPixels,
          pixelsPerMicrosecond
        });
        
        // Print metrics
        console.log(`  Compilation: ${compilationTime.toFixed(2)}ms`);
        console.log(`  Execution: ${executionTime.toFixed(2)}ms`);
        console.log(`  Pixels processed: ${totalPixels.toLocaleString()}`);
        console.log(`  Performance: ${pixelsPerMicrosecond.toFixed(2)} pixels/μs`);
        
      } catch (err) {
        console.error(`Error with ${generatorType}: ${err.message}`);
      }
    }
  }
  
  // Print summary
  console.log('\n\nPerformance Summary');
  console.log('==================');
  
  console.log('\nExecution time (ms):');
  console.log('------------------------------------------------------------------');
  console.log('| Configuration | JavaScript |   WASM   | Zero-Copy | Fastest    |');
  console.log('------------------------------------------------------------------');
  
  // Group by configuration
  const configGroups = {};
  results.forEach(result => {
    if (!configGroups[result.config]) {
      configGroups[result.config] = {};
    }
    configGroups[result.config][result.generator] = result.executionTime;
  });
  
  // Print summary table
  Object.keys(configGroups).forEach(config => {
    const jsTime = configGroups[config]['javascript'] 
      ? configGroups[config]['javascript'].toFixed(2).padStart(8) 
      : '    N/A ';
    
    const wasmTime = configGroups[config]['wasm'] 
      ? configGroups[config]['wasm'].toFixed(2).padStart(8) 
      : '    N/A ';
    
    const zeroTime = configGroups[config]['zero-copy-wasm'] 
      ? configGroups[config]['zero-copy-wasm'].toFixed(2).padStart(8) 
      : '    N/A ';
    
    // Determine fastest
    let fastest = 'N/A';
    let fastestTime = Infinity;
    
    if (configGroups[config]['javascript'] && configGroups[config]['javascript'] < fastestTime) {
      fastest = 'JavaScript';
      fastestTime = configGroups[config]['javascript'];
    }
    
    if (configGroups[config]['wasm'] && configGroups[config]['wasm'] < fastestTime) {
      fastest = 'WASM';
      fastestTime = configGroups[config]['wasm'];
    }
    
    if (configGroups[config]['zero-copy-wasm'] && configGroups[config]['zero-copy-wasm'] < fastestTime) {
      fastest = 'Zero-Copy';
      fastestTime = configGroups[config]['zero-copy-wasm'];
    }
    
    console.log(`| ${config.padEnd(13)} | ${jsTime}ms | ${wasmTime}ms | ${zeroTime}ms | ${fastest.padEnd(10)} |`);
  });
  
  console.log('------------------------------------------------------------------');
  
  console.log('\nPerformance (pixels/μs):');
  console.log('------------------------------------------------------------------');
  console.log('| Configuration | JavaScript |   WASM   | Zero-Copy | Fastest    |');
  console.log('------------------------------------------------------------------');
  
  // Group by configuration for performance
  const perfGroups = {};
  results.forEach(result => {
    if (!perfGroups[result.config]) {
      perfGroups[result.config] = {};
    }
    perfGroups[result.config][result.generator] = result.pixelsPerMicrosecond;
  });
  
  // Print performance table
  Object.keys(perfGroups).forEach(config => {
    const jsPerf = perfGroups[config]['javascript'] 
      ? perfGroups[config]['javascript'].toFixed(2).padStart(8) 
      : '    N/A ';
    
    const wasmPerf = perfGroups[config]['wasm'] 
      ? perfGroups[config]['wasm'].toFixed(2).padStart(8) 
      : '    N/A ';
    
    const zeroPerf = perfGroups[config]['zero-copy-wasm'] 
      ? perfGroups[config]['zero-copy-wasm'].toFixed(2).padStart(8) 
      : '    N/A ';
    
    // Determine fastest
    let fastest = 'N/A';
    let fastestPerf = 0;
    
    if (perfGroups[config]['javascript'] && perfGroups[config]['javascript'] > fastestPerf) {
      fastest = 'JavaScript';
      fastestPerf = perfGroups[config]['javascript'];
    }
    
    if (perfGroups[config]['wasm'] && perfGroups[config]['wasm'] > fastestPerf) {
      fastest = 'WASM';
      fastestPerf = perfGroups[config]['wasm'];
    }
    
    if (perfGroups[config]['zero-copy-wasm'] && perfGroups[config]['zero-copy-wasm'] > fastestPerf) {
      fastest = 'Zero-Copy';
      fastestPerf = perfGroups[config]['zero-copy-wasm'];
    }
    
    console.log(`| ${config.padEnd(13)} | ${jsPerf} px/μs | ${wasmPerf} px/μs | ${zeroPerf} px/μs | ${fastest.padEnd(10)} |`);
  });
  
  console.log('------------------------------------------------------------------');
}

// Run the simple profile
runSimpleProfile().catch(err => {
  console.error('Error running simple profile:', err);
  process.exit(1);
});
