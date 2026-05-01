#!/usr/bin/env node
/**
 * MarkLite++ ZIP Package Builder
 * Creates a distributable ZIP package from the Tauri build output.
 *
 * Usage: node scripts/create-zip.js [version]
 *   version - Optional, defaults to package.json version
 */

import { readFileSync, existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

/**
 * Read package.json and get version
 */
function getAppVersion(overrideVersion) {
  if (overrideVersion) return overrideVersion;
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  return pkg.version || '0.0.0';
}

/**
 * Validate that the exe exists
 */
function validateExe(exePath) {
  if (!existsSync(exePath)) {
    console.error(`❌ Executable not found: ${exePath}`);
    console.error('   Run "yarn tauri build" first to build the application.');
    process.exit(1);
  }
  const size = statSync(exePath).size;
  console.log(`✅ Found executable: ${exePath} (${formatSize(size)})`);
}

/**
 * Format bytes to human-readable string
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Copy runtime dependencies for the portable build
 */
function copyRuntimeDeps(stagingDir) {
  // Copy README.html to the staging directory
  const readmeSrc = join(ROOT, 'deploy', 'README.html');
  const readmeDest = join(stagingDir, 'README.html');
  if (existsSync(readmeSrc)) {
    copyFileSync(readmeSrc, readmeDest);
    console.log(`✅ Copied README.html`);
  }
}

/**
 * Create a ZIP archive using system zip command or Node.js fallback
 */
async function createZip(sourceDir, outputPath) {
  try {
    // Prefer system zip for better compression
    execSync(`zip -r "${outputPath}" .`, {
      cwd: sourceDir,
      stdio: 'pipe',
    });
  } catch {
    // Fallback: use Node.js archiver-style approach with simple tar+gzip
    console.warn('⚠️  System zip not available, using built-in method...');
    
    // Simple approach: use Node.js built-in to create a basic archive
    const archiver = await import('archiver').catch(() => null);
    if (archiver) {
      // Use archiver if available
      await createZipWithArchiver(sourceDir, outputPath);
    } else {
      // Final fallback: use tar.gz (always available on Unix-like systems)
      const tarOutput = outputPath.replace(/\.zip$/, '.tar.gz');
      execSync(`tar -czf "${tarOutput}" .`, { cwd: sourceDir });
      console.warn(`⚠️  Created ${basename(tarOutput)} instead (zip not available on this platform).`);
    }
  }

  if (existsSync(outputPath)) {
    const size = statSync(outputPath).size;
    console.log(`✅ Created ZIP: ${outputPath} (${formatSize(size)})`);
  }
}

async function createZipWithArchiver(sourceDir, outputPath) {
  const archiver = (await import('archiver')).default;
  const fs = await import('fs');
  
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Main entry point
 */
export async function createZipPackage(options = {}) {
  const {
    exePath = join(ROOT, 'src-tauri', 'target', 'release', 'marklite.exe'),
    outputDir = join(ROOT, 'dist'),
    version,
  } = options;

  const appVersion = getAppVersion(version);
  const zipFilename = `MarkLite-v${appVersion}-win64.zip`;
  const stagingDir = join(outputDir, `MarkLite-v${appVersion}-win64`);
  const outputPath = join(outputDir, zipFilename);

  console.log('');
  console.log('📦 MarkLite++ ZIP Builder');
  console.log(`========================`);
  console.log(`Version: ${appVersion}`);
  console.log('');

  // Step 1: Validate executable exists
  validateExe(exePath);

  // Step 2: Prepare staging directory
  mkdirSync(stagingDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  // Clean previous builds
  try {
    const existing = readdirSync(stagingDir);
    for (const file of existing) {
      // Skip gitkeep etc.
      if (!file.startsWith('.')) {
        // We'll just clean and rebuild
      }
    }
  } catch {
    // Directory doesn't exist yet, that's fine
  }

  // Step 3: Copy executable
  const exeDest = join(stagingDir, basename(exePath));
  copyFileSync(exePath, exeDest);
  console.log(`✅ Copied marklite.exe`);

  // Step 4: Copy runtime dependencies (README.html)
  copyRuntimeDeps(stagingDir);

  // Step 5: Create ZIP
  console.log('\n📦 Creating ZIP package...');
  await createZip(stagingDir, outputPath);

  // Step 6: Cleanup staging directory (optional - keep for debugging)
  // Uncomment the following line to clean up:
  // rmSync(stagingDir, { recursive: true, force: true });

  console.log('');
  console.log('🎉 Done! Output:');
  console.log(`   ${outputPath}`);

  return { outputPath, version: appVersion };
}

// CLI entry point
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const cliVersion = process.argv[2];
  createZipPackage({ version: cliVersion }).catch((err) => {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  });
}
