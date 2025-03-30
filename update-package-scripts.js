
// This is a helper script to update package.json scripts
// Run with: bun update-package-scripts.js

import fs from 'fs';

const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update scripts for Bun
packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "bun --hot server.ts",
  "start": "bun server.ts",
  "build": "bun build ./src/main.tsx --outdir ./dist"
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json scripts for Bun');
