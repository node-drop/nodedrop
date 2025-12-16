#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix relative imports that don't have .js extension
  const relativeImportRegex = /from\s+['"](\.[^'"]*?)['"]/g;
  
  content = content.replace(relativeImportRegex, (match, importPath) => {
    // Skip if already has .js extension or is a JSON file
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('/index.js')) {
      return match;
    }
    
    // Skip if it's a package import
    if (!importPath.startsWith('.')) {
      return match;
    }
    
    // Resolve the import path
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    
    // Try to find what exists
    let targetPath = null;
    
    // Check if it's a .js file
    if (fs.existsSync(resolvedPath + '.js')) {
      targetPath = importPath + '.js';
    }
    // Check if it's a directory with index.js
    else if (fs.existsSync(path.join(resolvedPath, 'index.js'))) {
      targetPath = importPath + '/index.js';
    }
    // Check if the path itself is a directory (for cases where it might be)
    else {
      const stat = fs.statSync(resolvedPath, { throwIfNoEntry: false });
      if (stat && stat.isDirectory() && fs.existsSync(path.join(resolvedPath, 'index.js'))) {
        targetPath = importPath + '/index.js';
      }
    }
    
    if (targetPath) {
      modified = true;
      return `from '${targetPath}'`;
    }
    
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed imports in ${path.relative(distDir, filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  });
}

if (fs.existsSync(distDir)) {
  console.log('Fixing ESM imports in dist directory...');
  walkDir(distDir);
  console.log('✓ ESM import fixes complete');
}
