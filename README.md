# 🚀 Development Guide

Welcome to Node Drop! This guide will help you get up and running quickly.

## Quick Start

### Option 1: Docker (Recommended for beginners)
```bash
# Clone the repository
git clone <your-repo-url>
cd node-drop

# Start development environment
npm run docker:setup
```

That's it! The script will:
- ✅ Check if Docker is running
- ✅ Create `.env` file from template
- ✅ Build and start all services
- ✅ Show you where everything is running

### Option 2: Local Development
```bash
# Install dependencies
npm install

# Start backend and frontend separately
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

## 📋 Available Commands

### Docker Commands
```bash
npm run docker:setup   # 🚀 Complete setup (recommended for first time)
npm run docker:dev     # 🔨 Start development environment
npm run docker:prod    # 🏭 Start production environment
npm run logs           # 📋 View all service logs
npm run stop           # ⏹️  Stop all services
npm run restart        # 🔄 Restart all services
npm run clean          # 🧹 Clean up containers and volumes
```

### Database Commands
```bash
npm run db:reset       # 🗑️  Reset database (careful!)
npm run db:migrate     # 📊 Run database migrations
npm run db:seed        # 🌱 Seed database with sample data
```

### Local Development
```bash
npm run dev            # 🏃 Start both frontend and backend
npm run dev:backend    # 🔧 Start only backend
npm run dev:frontend   # 🎨 Start only frontend
npm run build          # 📦 Build for production
npm run test           # 🧪 Run all tests
```

## 🌐 Service URLs

When running with Docker:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📁 Project Structure

```
node-drop/
├── frontend/           # React frontend
├── backend/            # Node.js backend
├── scripts/            # Development scripts
├── docker-compose.yml  # Production Docker setup
├── docker-compose.override.yml  # Development overrides
├── .env.example        # Environment template
└── DEVELOPMENT.md      # This file
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Key variables:
- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET`: Authentication secret
- `VITE_API_URL`: Frontend API URL

### Docker Override
The `docker-compose.override.yml` file automatically applies development-friendly settings:
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

# Nuclear option - clean everything
npm run clean
```

### Database Issues
```bash
# Reset database
npm run db:reset

# Check database connection
docker-compose exec backend npm run db:check
```

### Port Conflicts
If ports 3000, 4000, 5432, or 6379 are in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.override.yml`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test with: `npm run test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📚 Additional Resources

- [Backend API Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)

## 💡 Tips

- Use `npm run logs` to debug issues
- The development environment auto-reloads on code changes
- Database data persists between restarts
- Use `npm run clean` if you want a fresh start

Happy coding! 🎉