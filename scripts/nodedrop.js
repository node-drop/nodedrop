#!/usr/bin/env node

/**
 * Development script to run the NodeDrop CLI
 * This allows testing the CLI without publishing to npm
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the built CLI
const cliPath = path.join(__dirname, '..', 'cli', 'dist', 'index.js');

// Forward all arguments to the CLI
const args = process.argv.slice(2);

const child = spawn('node', [cliPath, ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});