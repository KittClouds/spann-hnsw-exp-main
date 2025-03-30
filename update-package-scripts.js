
// This script updates package.json scripts without directly modifying the file
// Run with: bun update-package-scripts.js

import { readFileSync, writeFileSync } from "fs";

const packageJsonPath = "./package.json";
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

// Update the scripts section
packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "bun --hot server.ts",
  "start": "bun server.ts",
  "build": "bun build --target browser ./src/main.tsx --outdir ./dist",
};

// Write back the updated package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("✅ Updated package.json scripts successfully!");
console.log("Now you can run:");
console.log("  bun dev     - Start development server with hot reloading");
console.log("  bun start   - Start production server");
console.log("  bun build   - Build for production");
