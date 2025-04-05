/**
 * BitBLT Custom Test Framework
 * 
 * A specialized testing framework for bit-level graphics operations
 * that provides detailed visual reporting of differences between
 * expected and actual bit patterns.
 */

// Import the BitBLT implementation
const path = require('path');
const fs = require('fs');

// Test suite management
let tests = [];
let currentSuite = null;
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

/**
 * Define a test suite
 * @param {string} name - Name of the test suite
 * @param {Function} fn - Function containing the tests
 */
function describe(name, fn) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
  currentSuite = name;
  fn();
}

/**
 * Define a test case
 * @param {string} name - Name of the test
 * @param {Function} fn - Test function
 */
function test(name, fn) {
  tests.push({ suite: currentSuite, name, fn, skip: false });
}

/**
 * Define a test case that will be skipped
 * @param {string} name - Name of the test
 * @param {Function} fn - Test function
 */
test.skip = function(name, fn) {
  tests.push({ suite: currentSuite, name, fn, skip: true });
};

/**
 * Run all defined tests
 */
function runTests() {
  console.log('\n🧪 Running BitBLT Tests...\n');
  
  for (const t of tests) {
    stats.total++;
    
    if (t.skip) {
      console.log(`  \x1b[90m⚪ SKIP: ${t.name}\x1b[0m`);
      stats.skipped++;
      continue;
    }
    
    try {
      t.fn();
      console.log(`  \x1b[32m✓ PASS: ${t.name}\x1b[0m`);
      stats.passed++;
    } catch (err) {
      console.log(`  \x1b[31m✗ FAIL: ${t.name}\x1b[0m`);
      console.log(`    ${err.message.replace(/\n/g, '\n    ')}`);
      stats.failed++;
    }
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  \x1b[32mPassed: ${stats.passed}\x1b[0m`);
  if (stats.failed > 0) {
    console.log(`  \x1b[31mFailed: ${stats.failed}\x1b[0m`);
  } else {
    console.log(`  Failed: ${stats.failed}`);
  }
  console.log(`  Skipped: ${stats.skipped}`);
  
  // Return exit code based on test results
  return stats.failed === 0 ? 0 : 1;
}

/**
 * Helper function to get the value of a specific bit in a packed buffer
 * @param {Uint32Array} buffer - The buffer containing packed pixels
 * @param {number} width - Width of the buffer in pixels
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} - The bit value (0 or 1)
 */
function getPixel(buffer, width, x, y) {
  const widthInUint32 = Math.ceil(width / 32);
  const elementIndex = Math.floor(x / 32) + y * widthInUint32;
  const bitPos = x % 32;
  return (buffer[elementIndex] >>> bitPos) & 1;
}

/**
 * Create a visual representation of a bit buffer
 * @param {Uint32Array} buffer - The buffer containing packed pixels
 * @param {number} width - Width of the buffer in pixels
 * @param {number} height - Height of the buffer in pixels
 * @returns {string} - ASCII art representation of the buffer
 */
function visualizeBitBuffer(buffer, width, height) {
  let result = '';
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      row += getPixel(buffer, width, x, y) ? '█' : '·';
    }
    result += row + '\n';
  }
  return result;
}

/**
 * Compare two bit buffers and generate a detailed report of differences
 * @param {Uint32Array} expected - Expected buffer
 * @param {Uint32Array} actual - Actual buffer
 * @param {number} width - Width of the buffers in pixels
 * @param {number} height - Height of the buffers in pixels
 * @returns {object} - Comparison result with details
 */
function compareBitBuffers(expected, actual, width, height) {
  let differences = [];
  let differenceCount = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const expectedBit = getPixel(expected, width, x, y);
      const actualBit = getPixel(actual, width, x, y);
      
      if (expectedBit !== actualBit) {
        differences.push({ x, y, expected: expectedBit, actual: actualBit });
        differenceCount++;
      }
    }
  }
  
  return {
    match: differenceCount === 0,
    differenceCount,
    differences,
    visualExpected: visualizeBitBuffer(expected, width, height),
    visualActual: visualizeBitBuffer(actual, width, height),
    visualDiff: generateDiffVisualization(expected, actual, width, height)
  };
}

/**
 * Generate a visual representation of differences between two buffers
 * @param {Uint32Array} expected - Expected buffer
 * @param {Uint32Array} actual - Actual buffer
 * @param {number} width - Width of the buffers in pixels
 * @param {number} height - Height of the buffers in pixels
 * @returns {string} - ASCII art representation of the differences
 */
function generateDiffVisualization(expected, actual, width, height) {
  let result = '';
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const expectedBit = getPixel(expected, width, x, y);
      const actualBit = getPixel(actual, width, x, y);
      
      if (expectedBit === actualBit) {
        row += expectedBit ? '█' : '·';
      } else if (expectedBit === 1) {
        row += '\x1b[31m-\x1b[0m'; // Missing pixel (in expected but not actual)
      } else {
        row += '\x1b[32m+\x1b[0m'; // Extra pixel (in actual but not expected)
      }
    }
    result += row + '\n';
  }
  return result;
}

/**
 * Assert that two bit buffers are equal
 * @param {Uint32Array} expected - Expected buffer
 * @param {Uint32Array} actual - Actual buffer
 * @param {number} width - Width of the buffers in pixels
 * @param {number} height - Height of the buffers in pixels
 * @param {string} message - Optional message for the assertion
 */
function assertBitBuffersEqual(expected, actual, width, height, message = 'Bit buffers should be equal') {
  const result = compareBitBuffers(expected, actual, width, height);
  
  if (!result.match) {
    let errorMessage = `${message}\n\n`;
    errorMessage += `Found ${result.differenceCount} differences\n\n`;
    
    errorMessage += 'Expected:\n';
    errorMessage += result.visualExpected + '\n';
    
    errorMessage += 'Actual:\n';
    errorMessage += result.visualActual + '\n';
    
    errorMessage += 'Diff (- missing, + extra):\n';
    errorMessage += result.visualDiff + '\n';
    
    if (result.differences.length <= 10) {
      errorMessage += 'Differences:\n';
      for (const diff of result.differences) {
        errorMessage += `  At (${diff.x}, ${diff.y}): expected ${diff.expected}, got ${diff.actual}\n`;
      }
    } else {
      errorMessage += `First 10 differences (of ${result.differences.length}):\n`;
      for (let i = 0; i < 10; i++) {
        const diff = result.differences[i];
        errorMessage += `  At (${diff.x}, ${diff.y}): expected ${diff.expected}, got ${diff.actual}\n`;
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Create a test buffer with packed pixels (32 pixels per Uint32)
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {number} fillValue - Value to fill (0 or 1)
 * @returns {Uint32Array} - The created buffer
 */
function createTestBuffer(width, height, fillValue) {
  const widthInUint32 = Math.ceil(width / 32);
  const buffer = new Uint32Array(widthInUint32 * height);
  
  if (fillValue === 1) {
    buffer.fill(0xFFFFFFFF);
  } else {
    buffer.fill(0);
  }
  
  return buffer;
}

/**
 * Create a test pattern in a buffer
 * @param {Uint32Array} buffer - The buffer to modify
 * @param {number} width - Width of the buffer in pixels
 * @param {number} height - Height of the buffer in pixels
 * @param {Function} patternFn - Function that returns 1 or 0 for each x,y coordinate
 */
function createPattern(buffer, width, height, patternFn) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = patternFn(x, y) ? 1 : 0;
      const widthInUint32 = Math.ceil(width / 32);
      const elementIndex = Math.floor(x / 32) + y * widthInUint32;
      const bitPos = x % 32;
      
      if (value === 1) {
        buffer[elementIndex] |= (1 << bitPos);
      } else {
        buffer[elementIndex] &= ~(1 << bitPos);
      }
    }
  }
}

// Common test patterns
const patterns = {
  checkerboard: (x, y) => (x & 1) ^ (y & 1),
  horizontal: (x, y) => y % 2 === 0,
  vertical: (x, y) => x % 2 === 0,
  diagonal: (x, y) => (x + y) % 2 === 0,
  circle: (x, y, centerX, centerY, radius) => {
    const dx = x - centerX;
    const dy = y - centerY;
    return dx * dx + dy * dy <= radius * radius;
  }
};

// Export the testing utilities
module.exports = {
  describe,
  test,
  runTests,
  getPixel,
  visualizeBitBuffer,
  compareBitBuffers,
  assertBitBuffersEqual,
  createTestBuffer,
  createPattern,
  patterns
};
