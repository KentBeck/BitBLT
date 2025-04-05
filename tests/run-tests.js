/**
 * BitBLT Test Runner
 *
 * Runs all tests for the BitBLT project.
 */

const fs = require("fs");
const path = require("path");

// Get all test files
const testDir = __dirname;
const testFiles = fs
  .readdirSync(testDir)
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => path.join(testDir, file));

console.log("🧪 BitBLT Test Runner");
console.log(`Found ${testFiles.length} test files\n`);

// Run each test file
let allPassed = true;
for (const testFile of testFiles) {
  console.log(`Running ${path.basename(testFile)}...`);
  try {
    // Use child_process to run each test in its own process
    const { execSync } = require("child_process");
    execSync(`node ${testFile}`, { stdio: "inherit" });
  } catch (err) {
    console.error(`Error running ${path.basename(testFile)}:`);
    console.error(err);
    allPassed = false;
  }
}

// Exit with appropriate code
process.exit(allPassed ? 0 : 1);
