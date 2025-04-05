/**
 * Performance Profiler for BitBLT
 * 
 * This module provides utilities for detailed performance profiling of BitBLT operations.
 */

// Store profiling data
const profiles = new Map();
let activeProfile = null;
let activeOperation = null;
let startTime = 0;

/**
 * Start profiling a new session
 * 
 * @param {string} name - Name of the profiling session
 */
function startProfiling(name) {
  if (activeProfile) {
    console.warn(`Already profiling "${activeProfile}". Stopping previous profile.`);
    stopProfiling();
  }
  
  activeProfile = name;
  profiles.set(name, {
    name,
    operations: new Map(),
    startTime: performance.now(),
    endTime: null,
    totalTime: 0
  });
  
  console.log(`Started profiling "${name}"`);
}

/**
 * Stop the current profiling session
 * 
 * @returns {Object} - The profile data
 */
function stopProfiling() {
  if (!activeProfile) {
    console.warn('No active profiling session to stop');
    return null;
  }
  
  if (activeOperation) {
    stopOperation();
  }
  
  const profile = profiles.get(activeProfile);
  profile.endTime = performance.now();
  profile.totalTime = profile.endTime - profile.startTime;
  
  console.log(`Stopped profiling "${activeProfile}" (${profile.totalTime.toFixed(2)}ms)`);
  
  const result = formatProfile(profile);
  activeProfile = null;
  
  return result;
}

/**
 * Start timing an operation within the current profile
 * 
 * @param {string} name - Name of the operation
 */
function startOperation(name) {
  if (!activeProfile) {
    console.warn('No active profiling session. Start profiling first.');
    return;
  }
  
  if (activeOperation) {
    stopOperation();
  }
  
  activeOperation = name;
  startTime = performance.now();
}

/**
 * Stop timing the current operation
 */
function stopOperation() {
  if (!activeProfile || !activeOperation) {
    console.warn('No active operation to stop');
    return;
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  const profile = profiles.get(activeProfile);
  if (!profile.operations.has(activeOperation)) {
    profile.operations.set(activeOperation, {
      name: activeOperation,
      calls: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0
    });
  }
  
  const operation = profile.operations.get(activeOperation);
  operation.calls++;
  operation.totalTime += duration;
  operation.minTime = Math.min(operation.minTime, duration);
  operation.maxTime = Math.max(operation.maxTime, duration);
  
  activeOperation = null;
}

/**
 * Format a profile into a readable report
 * 
 * @param {Object} profile - The profile to format
 * @returns {Object} - Formatted profile data
 */
function formatProfile(profile) {
  const operations = Array.from(profile.operations.values())
    .map(op => ({
      name: op.name,
      calls: op.calls,
      totalTime: op.totalTime,
      avgTime: op.totalTime / op.calls,
      minTime: op.minTime,
      maxTime: op.maxTime,
      percentage: (op.totalTime / profile.totalTime) * 100
    }))
    .sort((a, b) => b.totalTime - a.totalTime);
  
  return {
    name: profile.name,
    totalTime: profile.totalTime,
    operations
  };
}

/**
 * Print a profile report to the console
 * 
 * @param {Object} profile - The profile to print
 */
function printProfile(profile) {
  console.log(`\nProfile: ${profile.name}`);
  console.log(`Total time: ${profile.totalTime.toFixed(2)}ms`);
  console.log('\nOperations:');
  console.log('----------------------------------------------------------------------------');
  console.log('| Operation                  | Calls |   Total   |    Avg    |     % Time |');
  console.log('----------------------------------------------------------------------------');
  
  profile.operations.forEach(op => {
    const name = op.name.padEnd(26).substring(0, 26);
    const calls = op.calls.toString().padStart(5);
    const total = op.totalTime.toFixed(2).padStart(9);
    const avg = op.avgTime.toFixed(2).padStart(9);
    const percent = op.percentage.toFixed(1).padStart(9);
    
    console.log(`| ${name} | ${calls} | ${total}ms | ${avg}ms | ${percent}% |`);
  });
  
  console.log('----------------------------------------------------------------------------');
}

/**
 * Create a profiling wrapper for a function
 * 
 * @param {Function} fn - The function to profile
 * @param {string} name - Name for the profiled function
 * @returns {Function} - Wrapped function with profiling
 */
function profileFunction(fn, name) {
  return function(...args) {
    startOperation(name);
    const result = fn.apply(this, args);
    stopOperation();
    return result;
  };
}

/**
 * Create a profiling wrapper for an async function
 * 
 * @param {Function} fn - The async function to profile
 * @param {string} name - Name for the profiled function
 * @returns {Function} - Wrapped async function with profiling
 */
function profileAsyncFunction(fn, name) {
  return async function(...args) {
    startOperation(name);
    try {
      const result = await fn.apply(this, args);
      stopOperation();
      return result;
    } catch (err) {
      stopOperation();
      throw err;
    }
  };
}

/**
 * Profile a class by wrapping all its methods
 * 
 * @param {Object} instance - Class instance to profile
 * @param {string} className - Name of the class
 * @param {Array<string>} methodsToSkip - Methods to skip profiling
 * @returns {Object} - The same instance with profiled methods
 */
function profileClass(instance, className, methodsToSkip = []) {
  const proto = Object.getPrototypeOf(instance);
  const methods = Object.getOwnPropertyNames(proto)
    .filter(name => 
      typeof instance[name] === 'function' && 
      name !== 'constructor' &&
      !methodsToSkip.includes(name)
    );
  
  methods.forEach(method => {
    const originalMethod = instance[method];
    const methodName = `${className}.${method}`;
    
    if (originalMethod.constructor.name === 'AsyncFunction') {
      instance[method] = profileAsyncFunction(originalMethod, methodName);
    } else {
      instance[method] = profileFunction(originalMethod, methodName);
    }
  });
  
  return instance;
}

module.exports = {
  startProfiling,
  stopProfiling,
  startOperation,
  stopOperation,
  printProfile,
  profileFunction,
  profileAsyncFunction,
  profileClass
};
