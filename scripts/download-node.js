#!/usr/bin/env node

/**
 * Downloads Node.js binary for bundling with the Electron app.
 * This ensures the app works on Macs without Node.js installed.
 * 
 * Usage:
 *   node scripts/download-node.js          # Downloads for current architecture
 *   node scripts/download-node.js arm64    # Downloads for Apple Silicon
 *   node scripts/download-node.js x64      # Downloads for Intel Macs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Node.js version to bundle (should match your development version)
const NODE_VERSION = process.versions.node.split('.')[0]; // Major version
const FULL_NODE_VERSION = `v${process.versions.node}`;

// Determine target architecture
const targetArch = process.argv[2] || process.arch;
const validArch = targetArch === 'arm64' ? 'arm64' : 'x64';

const DOWNLOAD_URL = `https://nodejs.org/dist/${FULL_NODE_VERSION}/node-${FULL_NODE_VERSION}-darwin-${validArch}.tar.gz`;
const OUTPUT_DIR = path.join(__dirname, '..', 'bundled-node');
const TEMP_FILE = path.join(OUTPUT_DIR, 'node.tar.gz');

console.log(`📦 Downloading Node.js ${FULL_NODE_VERSION} for macOS ${validArch}...`);
console.log(`   URL: ${DOWNLOAD_URL}`);

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
} else {
  // Clean existing files
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download function with redirect support
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          console.log(`   Following redirect to: ${response.headers.location}`);
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${percent}%`);
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('\n   ✅ Download complete!');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {}); // Delete the file on error
        reject(err);
      });
    };
    
    request(url);
  });
}

async function main() {
  try {
    // Download the tarball
    await download(DOWNLOAD_URL, TEMP_FILE);
    
    console.log('📂 Extracting Node.js binary...');
    
    // Extract only the node binary
    execSync(`tar -xzf "${TEMP_FILE}" -C "${OUTPUT_DIR}" --strip-components=2 "node-${FULL_NODE_VERSION}-darwin-${validArch}/bin/node"`, {
      stdio: 'inherit'
    });
    
    // Make it executable
    const nodeBinary = path.join(OUTPUT_DIR, 'node');
    fs.chmodSync(nodeBinary, '755');
    
    // Clean up tarball
    fs.unlinkSync(TEMP_FILE);
    
    // Verify the binary
    const version = execSync(`"${nodeBinary}" --version`, { encoding: 'utf8' }).trim();
    console.log(`✅ Successfully bundled Node.js ${version} for ${validArch}`);
    console.log(`   Binary location: ${nodeBinary}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
