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