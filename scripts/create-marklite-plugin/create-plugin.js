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

async function main() {
  console.log('\n🧩 MarkLite Plugin Scaffolding\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const pluginId = await question(rl, 'Plugin ID (kebab-case)', 'my-plugin');
  const pluginName = await question(rl, 'Plugin display name', pluginId);
  const pluginDescription = await question(rl, 'Description', '');
  const authorName = await question(rl, 'Author', '');

  rl.close();

  const outputDir = path.resolve(process.cwd(), pluginId);

  if (fs.existsSync(outputDir)) {
    console.error(`\n❌ Directory "${pluginId}" already exists.`);
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
