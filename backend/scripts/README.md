# Backend Scripts

This directory contains utility scripts for backend operations.

## Scripts

### `create-production-mysql-zip.js`
Creates a production-ready ZIP file for the MySQL custom node.

**Usage:**
```bash
node scripts/create-production-mysql-zip.js
```

**What it does:**
- Packages the MySQL node with all dependencies
- Includes `node_modules` for runtime dependencies
- Validates file structure and contents
- Creates `MySQL-Production.zip` ready for upload

**Output:**
- `backend/custom-nodes/MySQL/MySQL-Production.zip`

**Requirements:**
- MySQL node dependencies must be installed (`npm install` in MySQL directory)
- All required files must be present (package.json, index.js, node files, credentials)

## Adding New Scripts

When adding new utility scripts:
1. Place them in this `scripts/` directory
2. Add documentation to this README
3. Use descriptive names (e.g., `create-[node-name]-zip.js`)
4. Include error handling and validation
5. Provide clear console output