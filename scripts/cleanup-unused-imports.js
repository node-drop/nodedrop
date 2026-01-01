#!/usr/bin/env node

/**
 * Script to remove unused BuiltInNodeTypes imports from node files
 */

const fs = require('fs');
const path = require('path');

// Directories to search
const directories = [
  'backend/src/nodes',
  'backend/custom-nodes'
];

// Track statistics
let filesProcessed = 0;
let filesModified = 0;

/**
 * Recursively find all .ts and .js files
 */
function findNodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findNodeFiles(filePath, fileList);
    } else if (file.endsWith('.node.ts') || file.endsWith('.node.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Remove BuiltInNodeTypes from imports if not used in the file
 */
function cleanupImports(content) {
  // Check if BuiltInNodeTypes is used anywhere except in imports
  const usedInCode = /BuiltInNodeTypes\.[A-Z_]+/.test(content);
  
  if (usedInCode) {
    return { content, modified: false };
  }
  
  let modified = false;
  let newContent = content;
  
  // Pattern 1: Remove from multi-line imports
  // import {
  //   BuiltInNodeTypes,
  //   OtherType
  // }
  newContent = newContent.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*['"]/g,
    (match, imports) => {
      if (!imports.includes('BuiltInNodeTypes')) {
        return match;
      }
      
      // Split imports and filter out BuiltInNodeTypes
      const importList = imports
        .split(',')
        .map(i => i.trim())
        .filter(i => i && !i.includes('BuiltInNodeTypes'));
      
      if (importList.length === 0) {
        // Remove entire import statement
        modified = true;
        return '';
      }
      
      // Reconstruct import without BuiltInNodeTypes
      modified = true;
      const newImports = importList.join(',\n  ');
      return match.replace(imports, '\n  ' + newImports + '\n');
    }
  );
  
  // Clean up any double blank lines
  newContent = newContent.replace(/\n\n\n+/g, '\n\n');
  
  // Clean up blank lines at the start of file
  newContent = newContent.replace(/^\n+/, '');
  
  return { content: newContent, modified };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  filesProcessed++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains BuiltInNodeTypes import
    if (!content.includes('BuiltInNodeTypes')) {
      return;
    }
    
    const { content: newContent, modified } = cleanupImports(content);
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesModified++;
      console.log(`✓ Cleaned: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Searching for node files...\n');
  
  let allFiles = [];
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = findNodeFiles(dir);
      allFiles = allFiles.concat(files);
      console.log(`Found ${files.length} files in ${dir}`);
    } else {
      console.log(`⚠ Directory not found: ${dir}`);
    }
  });
  
  console.log(`\n📝 Processing ${allFiles.length} files...\n`);
  
  allFiles.forEach(processFile);
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Summary:');
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Files cleaned: ${filesModified}`);
  console.log('='.repeat(50));
}

// Run the script
main();
