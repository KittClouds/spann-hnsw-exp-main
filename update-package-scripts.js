
// One-time script to update package.json scripts
import { readFileSync, writeFileSync } from 'fs';

// Read package.json
const packageJsonPath = './package.json';
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// Update scripts
packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "bun --watch --hot server.ts",
  "build": "bun build ./src/main.tsx --outdir ./dist --minify",
  "preview": "bun server.ts"
};

// Write back to package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('Updated package.json scripts:');
console.log('  dev: "bun --watch --hot server.ts"');
console.log('  build: "bun build ./src/main.tsx --outdir ./dist --minify"');
console.log('  preview: "bun server.ts"');
console.log('\nRun "bun dev" to start the development server');
