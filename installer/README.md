# Node-Drop

One-command installation for Node-Drop workflow automation platform.

## Usage

```bash
npx @nodedrop/create
```

Or simply:

```bash
npm create nodedrop
```

That's it! The wizard will guide you through the installation process.

## What it does

The installation wizard will:
- ✓ Check if Docker and Docker Compose are installed
- ✓ Ask where you want to install Node-Drop
- ✓ Ask which port to use (default: 5678)
- ✓ Generate secure passwords automatically
- ✓ Create docker-compose.yml configuration
- ✓ Create convenient start/stop scripts
- ✓ Pull the Docker image
- ✓ Start Node-Drop

## Requirements

- Docker
- Docker Compose
- Node.js (to run the installer)

## After Installation

Once installed, you'll have these commands in your installation directory:

**Windows:**
- `start.bat` - Start Node-Drop
- `stop.bat` - Stop Node-Drop
- `logs.bat` - View logs

**Linux/Mac:**
- `./start.sh` - Start Node-Drop
- `./stop.sh` - Stop Node-Drop
- `./logs.sh` - View logs

## Global Installation

You can also install globally:

```bash
npm install -g @nodedrop/create
nodedrop
```

## Support

For issues and documentation, visit:
https://github.com/your-org/node-drop

## License

MIT
