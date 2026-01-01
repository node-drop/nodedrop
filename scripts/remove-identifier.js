#!/usr/bin/env node

/**
 * Script to remove identifier property from all node definitions
 * Removes lines like: identifier: 'node-name',
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
let identifiersRemoved = 0;

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
    } else if (file.endsWith('.node.ts') || file.endsWith('.node.js') || file.endsWith('.ts') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Remove identifier property from file content
 */
function removeIdentifier(content) {
  // Match identifier lines with various formats:
  // identifier: 'value',
  // identifier: "value",
  // identifier: `value`,
  // identifier: BuiltInNodeTypes.VALUE,
  const identifierRegex = /^(\s*)identifier:\s*(['"`][^'"`]*['"`]|BuiltInNodeTypes\.[A-Z_]+),?\s*$/gm;
  
  let modified = false;
  const newContent = content.replace(identifierRegex, (match) => {
    modified = true;
    identifiersRemoved++;
    return ''; // Remove the line
  });
  
  // Clean up any double blank lines that might result
  const cleanedContent = newContent.replace(/\n\n\n+/g, '\n\n');
  
  return { content: cleanedContent, modified };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  filesProcessed++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains identifier property
    if (!content.includes('identifier:')) {
      return;
    }
    
    const { content: newContent, modified } = removeIdentifier(content);
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesModified++;
      console.log(`✓ Modified: ${filePath}`);
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
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Identifiers removed: ${identifiersRemoved}`);
  console.log('='.repeat(50));
}

// Run the script
main();
