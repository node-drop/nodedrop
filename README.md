# 🚀 Node-Drop

A powerful workflow automation platform similar to n8n, built with Node.js, React, and TypeScript.

## ✨ Features

- 🔄 Visual workflow builder with drag-and-drop interface
- 🔌 Extensible node system for custom integrations
- �  Secure authentication and authorization
- 📊 Real-time workflow execution monitoring
- 🐳 Docker-ready with single-container architecture
- 🎨 Modern, responsive UI built with React and Vite

## 📋 Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR **Node.js** >= 18.0.0 and **npm** >= 9.0.0
- **PostgreSQL** 14+ (if running without Docker)
- **Redis** 6+ (if running without Docker)

## � Installation

### Quick Start (Recommended)

```bash
npm create nodedrop
# or
npx @nodedrop/create
```

That's it! Visit **http://localhost:5678/register** to create your admin account.

### From Source

```bash
git clone git@github.com:node-drop/nodedrop.git
cd nodedrop
cp .env.example .env
docker-compose up --build
```

Access at **http://localhost:5678**

## 💻 Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start with Docker (recommended)
npm run docker:setup

# Or start manually (requires PostgreSQL and Redis)
npm run dev:backend    # Terminal 1
npm run dev:frontend   # Terminal 2
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 🔧 Available Scripts

### Root Level
```bash
npm run dev              # Start both frontend and backend in dev mode
npm run build            # Build both frontend and backend
npm run test             # Run all tests
npm run docker:dev       # Start with Docker (development mode)
npm run docker:prod      # Start with Docker (production mode)
npm run logs             # View Docker logs
npm run stop             # Stop Docker containers
npm run restart          # Restart Docker containers
npm run clean            # Clean Docker volumes and containers
```

### Database Management
```bash
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database
npm run db:seed          # Seed database with sample data
```

### CLI Tool
```bash
npm run cli:build        # Build CLI tool
npm run nodedrop         # Run CLI commands
```

## 🐳 Docker Details

Node-drop uses a **unified single-container architecture** for production:
- Single container running on port **5678**
- Backend serves frontend static files
- PostgreSQL and Redis run as separate services
- Multi-platform support (amd64, arm64)

For more details, see [DOCKER.md](./DOCKER.md)

## 🔄 Updating Node-Drop

To update to the latest version:

```bash
cd nodedrop  # or your installation directory
docker-compose pull
docker-compose up -d
```

That's it! Your data is preserved in Docker volumes.

**What gets updated:**
- ✓ Application code (frontend + backend)
- ✓ Bug fixes and new features
- ✓ Security patches

**What stays the same:**
- ✓ Your workflows
- ✓ Your credentials
- ✓ Your database
- ✓ Your settings

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
POSTGRES_USER=nodedrop
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=nodedrop
DATABASE_URL=postgresql://nodedrop:your_secure_password@postgres:5432/nodedrop

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_redis_password@redis:6379

# Backend
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
PORT=5678

# Frontend (development only)
VITE_API_URL=http://localhost:4000
```

### Docker Override

The `docker-compose.override.yml` file automatically applies development settings:
- Exposes database ports for local tools
- Enables hot reloading
- Uses development Dockerfiles
- Mounts source code as volumes

## 🐛 Troubleshooting

### Docker Issues

```bash
# Check if Docker is running
docker info

# View service logs
npm run logs

# Restart everything
npm run restart

# Clean everything and start fresh
npm run clean
docker-compose up --build
```

### Database Issues

```bash
# Reset database
npm run db:reset

# Check database connection
docker-compose exec backend npm run db:check

# View database logs
docker-compose logs postgres
```

### Port Conflicts

If ports 3000, 4000, 5432, 5678, or 6379 are in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml` or `docker-compose.override.yml`

### Build Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules frontend/node_modules backend/node_modules cli/node_modules
npm install

# Rebuild Docker images from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run backend tests only
cd backend
npm run test

# Run frontend tests only
cd frontend
npm run test

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📚 Documentation

- [Docker Setup Guide](./DOCKER.md)
- [Updating Guide](./docs/UPDATING.md) - How to update to the latest version
- [Enable Auto-Update](./docs/ENABLE-AUTO-UPDATE.md) - Enable in-app updates (if not working)
- [Backend API Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Database Schema](./backend/DATABASE.md)

## 💡 Tips

- Use `npm run logs` to debug issues in real-time
- The development environment auto-reloads on code changes
- Database data persists between restarts in Docker volumes
- Use `npm run clean` for a completely fresh start
- Install the React DevTools browser extension for debugging

## 📦 Editions

### Community Edition (This Repo)
Free, self-hosted, unlimited workflows and executions. Perfect for individuals and small teams.

### Cloud Edition
Managed SaaS at [nodedrop.io](https://nodedrop.io) with multi-workspace, team collaboration, and enterprise features.

See [docs/EDITIONS.md](./docs/EDITIONS.md) for details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [n8n](https://n8n.io/)
- Built with [React](https://react.dev/), [Node.js](https://nodejs.org/), and [TypeScript](https://www.typescriptlang.org/)

---

Happy automating! 🎉
