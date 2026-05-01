#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TEMPLATE_DIR = path.join(__dirname, 'template');

function question(rl, prompt, defaultValue) {
  const display = defaultValue ? `${prompt} (${defaultValue}): ` : `${prompt}: `;
  return new Promise((resolve) => {
    rl.question(display, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function copyDir(src, dest, replacements) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath, replacements);
    } else {
      let content = fs.readFileSync(srcPath, 'utf-8');
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(`{{${key}}}`, value);
      }
      fs.writeFileSync(destPath, content);
    }
  }
}

function validatePluginId(pluginId) {
  if (!pluginId || !pluginId.trim()) {
    return { valid: false, reason: 'Plugin ID cannot be empty' };
  }
  
  if (pluginId.includes('/')) {
    return { valid: false, reason: 'Plugin ID cannot contain slashes (/)' };
  }
  
  if (pluginId.includes('\\')) {
    return { valid: false, reason: 'Plugin ID cannot contain backslashes (\\\\)' };
  }
  
  if (pluginId.includes('..')) {
    return { valid: false, reason: 'Plugin ID cannot contain parent directory (..)' };
  }
  
  if (pluginId.includes('~')) {
    return { valid: false, reason: 'Plugin ID cannot contain tilde (~)' };
  }
  
  if (pluginId.startsWith('.')) {
    return { valid: false, reason: 'Plugin ID cannot start with dot (.)' };
  }
  
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pluginId)) {
    return { valid: false, reason: 'Plugin ID must be kebab-case (lowercase letters, numbers, hyphens)' };
  }
  
  return { valid: true };
}

async function main() {
  console.log('\n🧩 MarkLite++ Plugin Scaffolding\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let pluginId, pluginName, pluginDescription, authorName;
  
  while (true) {
    pluginId = await question(rl, 'Plugin ID (kebab-case)', 'my-plugin');
    const validation = validatePluginId(pluginId);
    if (validation.valid) {
      break;
    }
    console.log(`❌ ${validation.reason}. Please try again.\n`);
  }
  
  pluginName = await question(rl, 'Plugin display name', pluginId);
  pluginDescription = await question(rl, 'Description', '');
  authorName = await question(rl, 'Author', '');

  rl.close();

  const outputDir = path.resolve(process.cwd(), pluginId);
  
  // Security: ensure output directory is within current working directory
  const resolvedCwd = path.resolve(process.cwd());
  if (!outputDir.startsWith(resolvedCwd)) {
    console.error('\n❌ Security error: Plugin directory would be created outside current directory');
    console.error('   This could be a path traversal attempt.');
    process.exit(1);
  }

  if (fs.existsSync(outputDir)) {
    console.error(`\n❌ Directory "${pluginId}" already exists.`);
    console.error('   Choose a different plugin ID.');
    process.exit(1);
  }

  const replacements = { pluginId, pluginName, pluginDescription, authorName };
  copyDir(TEMPLATE_DIR, outputDir, replacements);

  // Read back README to display
  const readmePath = path.join(outputDir, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf-8');

  console.log(`\n✅ Plugin "${pluginName}" created at ${outputDir}/\n`);
  console.log(readme);
  console.log('Happy hacking! 🚀\n');
}

main();
