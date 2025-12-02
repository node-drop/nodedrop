# NodeDrop CLI

A command-line interface for the NodeDrop workflow automation platform.

## Installation

### Global Installation (Recommended)

```bash
npm install -g nodedrop
```

### Using npx (No Installation Required)

```bash
npx nodedrop <command>
```

## Commands

### Initialize a New Project

```bash
# Interactive setup
npx nodedrop init

# With options
npx nodedrop init --name my-project --template advanced
```

### Start the Platform

```bash
# Start in interactive mode
nodedrop start

# Start in background (detached mode)
nodedrop start --detached

# Start on custom port
nodedrop start --port 8080
```

### Stop the Platform

```bash
nodedrop stop
```

### Check Status

```bash
nodedrop status
```

### Node Management

```bash
# List all nodes
nodedrop nodes list

# List only active nodes
nodedrop nodes list --active

# Create a new node
nodedrop nodes create

# Activate a node
nodedrop nodes activate <nodeId>

# Deactivate a node
nodedrop nodes deactivate <nodeId>
```

## Templates

### Basic Template
- Simple workflow setup
- Essential nodes included
- Perfect for getting started

### Advanced Template
- Full-featured setup
- All available nodes
- Advanced configuration options
- Production-ready setup

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (optional, for containerized setup)

## Development

```bash
# Clone the repository
git clone <repository-url>
cd cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Test locally
npm link
nodedrop --help
```

## Publishing

```bash
# Build and publish
npm run build
npm publish
```

## License

MIT