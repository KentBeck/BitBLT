/**
 * SharedArrayBuffer BitBLT Benchmark
 * 
 * This benchmark specifically tests the performance of BitBLT with SharedArrayBuffer.
 */

const { 
  bitblt, 
  setGeneratorType, 
  createGenerator 
} = require('../src/bitblt');

// Import patterns for creating test data
const { createPattern, patterns } = require('../tests/bitblt-tester');

/**
 * Create a test buffer using SharedArrayBuffer
 * 
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {number} fillValue - Value to fill the buffer with
 * @returns {Uint32Array} - Test buffer
 */
function createSharedTestBuffer(width, height, fillValue = 0) {
  // Calculate buffer size in Uint32 elements
  const bufferSize = Math.ceil(width * height / 32);
  
  // Create a SharedArrayBuffer
  const sharedBuffer = new SharedArrayBuffer(bufferSize * 4);
  
  // Create a Uint32Array view of the buffer
  const buffer = new Uint32Array(sharedBuffer);
  
  // Fill the buffer with the specified value
  buffer.fill(fillValue);
  
  return buffer;
}

/**
 * Run a benchmark with SharedArrayBuffer
 * 
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {Function} pattern - Pattern function
 * @param {number} iterations - Number of iterations
 */
async function runSharedBufferBenchmark(width, height, pattern, iterations = 20) {
  console.log(`Running SharedArrayBuffer benchmark (${width}x${height})...`);
  
  // Check if SharedArrayBuffer is available
  if (typeof SharedArrayBuffer === 'undefined') {
    console.error('SharedArrayBuffer is not available in this environment');
    return;
  }
  
  // Create buffers
  const srcBuffer = createSharedTestBuffer(width, height, 0);
  const dstBuffer = createSharedTestBuffer(width, height, 0);
  
  // Fill source buffer with pattern
  createPattern(srcBuffer, width, height, pattern);
  
  // Set generator type to WASM
  setGeneratorType('wasm');
  
  // Warm up
  await bitblt(
    srcBuffer, width, height, 0, 0,
    dstBuffer, width, 0, 0, width, height
  );
  
  // Run the benchmark
  const times = [];
  const totalPixels = width * height;
  
  for (let i = 0; i < iterations; i++) {
    const startTime = process.hrtime.bigint();
    
    await bitblt(
      srcBuffer, width, height, 0, 0,
      dstBuffer, width, 0, 0, width, height
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
  
  const avgTime = trimmedTimes.reduce((sum, time) => sum + time, 0) / trimmedTimes.length;
  const minTime = trimmedTimes[0];
  const maxTime = trimmedTimes[trimmedTimes.length - 1];
  
  // Calculate pixels per microsecond
  const avgPixelsPerMicro = totalPixels / avgTime;
  const maxPixelsPerMicro = totalPixels / minTime;
  
  console.log(`Average time: ${avgTime.toFixed(2)} μs`);
  console.log(`Min time: ${minTime.toFixed(2)} μs`);
  console.log(`Max time: ${maxTime.toFixed(2)} μs`);
  console.log(`Average pixels per microsecond: ${avgPixelsPerMicro.toFixed(2)}`);
  console.log(`Max pixels per microsecond: ${maxPixelsPerMicro.toFixed(2)}`);
  
  return {
    width,
    height,
    totalPixels,
    avgTime,
    minTime,
    maxTime,
    avgPixelsPerMicro,
    maxPixelsPerMicro
  };
}

/**
 * Run all SharedArrayBuffer benchmarks
 */
async function runAllSharedBufferBenchmarks() {
  console.log('SharedArrayBuffer BitBLT Benchmark');
  console.log('==================================');
  console.log();
  
  // Check if SharedArrayBuffer is available
  if (typeof SharedArrayBuffer === 'undefined') {
    console.error('SharedArrayBuffer is not available in this environment');
    return;
  }
  
  const results = [];
  
  // Test different sizes
  const sizes = [
    { width: 32, height: 32 },
    { width: 128, height: 128 },
    { width: 512, height: 512 },
    { width: 1024, height: 1024 }
  ];
  
  for (const size of sizes) {
    console.log(`\nTesting ${size.width}x${size.height}:`);
    
    const result = await runSharedBufferBenchmark(
      size.width,
      size.height,
      patterns.checkerboard,
      20
    );
    
    results.push(result);
  }
  
  // Print results table
  console.log('\nResults Summary (pixels per microsecond)');
  console.log('=======================================');
  console.log();
  
  // Print header
  console.log('| Size | Total Pixels | Avg Time (μs) | Avg Pixels/μs | Max Pixels/μs |');
  console.log('|------|--------------|---------------|---------------|---------------|');
  
  // Print results
  for (const result of results) {
    console.log(
      `| ${result.width}x${result.height} | ${result.totalPixels.toLocaleString()} | ${result.avgTime.toFixed(2).padStart(13)} | ${result.avgPixelsPerMicro.toFixed(2).padStart(13)} | ${result.maxPixelsPerMicro.toFixed(2).padStart(13)} |`
    );
  }
}

// Run the benchmarks
runAllSharedBufferBenchmarks().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
