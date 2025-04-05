/**
 * BitBLT Benchmark Runner
 * 
 * This script runs the BitBLT benchmarks and generates a visual chart of the results.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run the benchmark
console.log('Running BitBLT benchmarks...');
console.log();

try {
  // Run the benchmark and capture the output
  const output = execSync('node benchmark/bitblt-benchmark.js', { encoding: 'utf8' });
  
  // Print the output
  console.log(output);
  
  // Extract the comparison table
  const comparisonMatch = output.match(/JavaScript vs WebAssembly Comparison[\s\S]+?\| Configuration \| Pattern \| JS Pixels\/μs \| WASM Pixels\/μs \| WASM\/JS Ratio \|[\s\S]+?(?=\n\n)/);
  
  if (comparisonMatch) {
    const comparisonTable = comparisonMatch[0];
    
    // Parse the table
    const lines = comparisonTable.split('\n').filter(line => line.trim() !== '');
    const headerLine = lines.findIndex(line => line.includes('Configuration'));
    const dataLines = lines.slice(headerLine + 2);
    
    // Extract data
    const data = dataLines.map(line => {
      const parts = line.split('|').map(part => part.trim());
      return {
        config: parts[1],
        pattern: parts[2],
        jsPerf: parseFloat(parts[3].replace(/,/g, '')),
        wasmPerf: parseFloat(parts[4].replace(/,/g, '')),
        ratio: parseFloat(parts[5].replace(/,/g, ''))
      };
    });
    
    // Generate HTML report
    const htmlReport = generateHtmlReport(data, output);
    
    // Save the report
    const reportPath = path.join(__dirname, 'benchmark-report.html');
    fs.writeFileSync(reportPath, htmlReport);
    
    console.log(`Benchmark report saved to ${reportPath}`);
    console.log(`Open the report in a browser to view the charts.`);
  } else {
    console.error('Could not extract comparison table from benchmark output.');
  }
} catch (err) {
  console.error('Error running benchmark:', err.message);
  process.exit(1);
}

/**
 * Generate an HTML report with charts
 * 
 * @param {Array} data - Benchmark data
 * @param {string} rawOutput - Raw benchmark output
 * @returns {string} - HTML report
 */
function generateHtmlReport(data, rawOutput) {
  // Prepare data for charts
  const configs = [...new Set(data.map(item => item.config))];
  const patterns = [...new Set(data.map(item => item.pattern))];
  
  // Prepare data for bar chart
  const jsData = [];
  const wasmData = [];
  const labels = [];
  
  for (const config of configs) {
    for (const pattern of patterns) {
      const item = data.find(d => d.config === config && d.pattern === pattern);
      
      if (item) {
        jsData.push(item.jsPerf);
        wasmData.push(item.wasmPerf);
        labels.push(`${config} - ${pattern}`);
      }
    }
  }
  
  // Prepare data for ratio chart
  const ratioData = data.map(item => item.ratio);
  
  // Generate HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BitBLT Performance Benchmark</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1, h2 {
      color: #333;
    }
    .chart-container {
      margin-bottom: 40px;
      height: 400px;
    }
    .raw-output {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      white-space: pre-wrap;
      font-family: monospace;
      overflow-x: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <h1>BitBLT Performance Benchmark</h1>
  
  <h2>Performance Comparison (pixels per microsecond)</h2>
  <div class="chart-container">
    <canvas id="performanceChart"></canvas>
  </div>
  
  <h2>WASM/JS Performance Ratio</h2>
  <div class="chart-container">
    <canvas id="ratioChart"></canvas>
  </div>
  
  <h2>Results Table</h2>
  <table>
    <tr>
      <th>Configuration</th>
      <th>Pattern</th>
      <th>JavaScript (pixels/μs)</th>
      <th>WebAssembly (pixels/μs)</th>
      <th>WASM/JS Ratio</th>
    </tr>
    ${data.map(item => `
    <tr>
      <td>${item.config}</td>
      <td>${item.pattern}</td>
      <td>${item.jsPerf.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
      <td>${item.wasmPerf.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
      <td>${item.ratio.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Raw Benchmark Output</h2>
  <div class="raw-output">${rawOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  
  <script>
    // Performance chart
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    new Chart(performanceCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [
          {
            label: 'JavaScript',
            data: ${JSON.stringify(jsData)},
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'WebAssembly',
            data: ${JSON.stringify(wasmData)},
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Pixels per Microsecond'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Configuration - Pattern'
            }
          }
        }
      }
    });
    
    // Ratio chart
    const ratioCtx = document.getElementById('ratioChart').getContext('2d');
    new Chart(ratioCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [
          {
            label: 'WASM/JS Ratio',
            data: ${JSON.stringify(ratioData)},
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Ratio (higher is better for WASM)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Configuration - Pattern'
            }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}
