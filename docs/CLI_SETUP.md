# NodeDrop CLI Setup Guide

This guide explains how to set up and use the NodeDrop CLI tool.

## Quick Start

### Option 1: Use npx (Recommended for trying out)

```bash
# Initialize a new NodeDrop project
npx nodedrop init my-awesome-project

# Navigate to the project
cd my-awesome-project

# Start the platform
npx nodedrop start
```

### Option 2: Global Installation

```bash
# Install globally (after publishing to npm)
npm install -g nodedrop

# Use anywhere
nodedrop init my-project
cd my-project
nodedrop start
```

### Option 3: Development/Local Testing

```bash
# In the NodeDrop repository root
npm run cli:build
npm run nodedrop -- init test-project
```

## Available Commands

### Project Management

```bash
# Initialize new project
nodedrop init [project-name]
nodedrop init --name my-project --template advanced

# Start the platform
nodedrop start
nodedrop start --detached  # Run in background
nodedrop start --port 8080  # Custom port

# Stop the platform
nodedrop stop

# Check status
nodedrop status
```

### Node Management

```bash
# List all workflow nodes
nodedrop nodes list
nodedrop nodes list --active    # Only active nodes
nodedrop nodes list --inactive  # Only inactive nodes

# Create new node
nodedrop nodes create
nodedrop nodes create --name "My Node" --type action

# Manage nodes
nodedrop nodes activate <nodeId>
nodedrop nodes deactivate <nodeId>
```

## Publishing the CLI

To make the CLI available via `npx nodedrop`:

1. **Update package.json version**:
   ```bash
   cd cli
   npm version patch  # or minor/major
   ```

2. **Build and test**:
   ```bash
   npm run build
   npm link  # Test locally
   nodedrop --help
   ```

3. **Publish to npm**:
   ```bash
   npm publish
   ```

4. **Test installation**:
   ```bash
   npm unlink  # Remove local link
   npx nodedrop@latest --help
   ```

## Development

### Building the CLI

```bash
# Build once
npm run cli:build

# Watch mode (if needed)
cd cli
npm run dev
```

### Testing Changes

```bash
# Test without publishing
npm run nodedrop -- <command>

# Example
npm run nodedrop -- init test-project
npm run nodedrop -- status
```

### Adding New Commands

1. Create command file in `cli/src/commands/`
2. Import and add to `cli/src/index.ts`
3. Build and test: `npm run cli:build`

## Troubleshooting

### CLI not found
- Make sure you've built the CLI: `npm run cli:build`
- For global install: `npm install -g nodedrop`
- For npx: Use full command `npx nodedrop`

### Permission errors
- On Unix systems: `chmod +x cli/dist/index.js`
- On Windows: Run as administrator if needed

### Docker issues
- Make sure Docker is installed and running
- Check `docker --version` and `docker-compose --version`

### Port conflicts
- Use `--port` flag to specify different port
- Check what's running: `netstat -an | findstr :3000` (Windows)

## Examples

### Complete workflow

```bash
# 1. Create new project
npx nodedrop init my-workflow-app --template advanced

# 2. Navigate to project
cd my-workflow-app

# 3. Start platform
nodedrop start --detached

# 4. Check status
nodedrop status

# 5. Manage nodes
nodedrop nodes list
nodedrop nodes create --name "Email Sender" --type action

# 6. Stop when done
nodedrop stop
```

### Development workflow

```bash
# In NodeDrop repo
npm run cli:build
npm run nodedrop -- init test-project
cd test-project
npm run nodedrop -- start
```