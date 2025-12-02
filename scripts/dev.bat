@echo off
REM Development setup script for Node Drop (Windows)

echo 🚀 Starting Node Drop development environment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ✅ Created .env file. Please review and update if needed.
)

REM Build and start services
echo 🔨 Building and starting services...
docker-compose up --build -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service health
echo 🔍 Checking service health...
docker-compose ps

echo.
echo ✅ Development environment is ready!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:4000
echo 🐘 PostgreSQL: localhost:5432
echo 🔴 Redis: localhost:6379
echo.
echo 📋 Useful commands:
echo   npm run logs     - View all logs
echo   npm run stop     - Stop all services
echo   npm run restart  - Restart all services
echo   npm run clean    - Clean up containers and volumes
echo.