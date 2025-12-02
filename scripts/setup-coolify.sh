#!/bin/bash

# Coolify Setup Script for node drop
# This script helps configure the application for Coolify deployment

set -e

echo "🚀 Setting up node drop for Coolify deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate secure random string
generate_secret() {
    openssl rand -hex 32
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

echo -e "${YELLOW}📋 Coolify Deployment Checklist${NC}"
echo "=================================="

# Check if required files exist
echo -e "${YELLOW}1. Checking required files...${NC}"

required_files=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "COOLIFY_DEPLOYMENT.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ✅ $file exists"
    else
        echo -e "   ❌ $file missing"
        exit 1
    fi
done

# Generate secrets
echo -e "${YELLOW}2. Generating secure secrets...${NC}"

POSTGRES_PASSWORD=$(generate_secret)
JWT_SECRET=$(generate_jwt_secret)
CREDENTIAL_ENCRYPTION_KEY=$(generate_secret)

echo -e "${GREEN}Generated secrets (save these securely):${NC}"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "JWT_SECRET=$JWT_SECRET"
echo "CREDENTIAL_ENCRYPTION_KEY=$CREDENTIAL_ENCRYPTION_KEY"

# Create environment template
echo -e "${YELLOW}3. Creating environment template...${NC}"

cat > .env.coolify.generated << EOF
# Generated secrets for Coolify deployment
# Copy these to your Coolify environment variables

# Database Configuration
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# JWT Configuration  
JWT_SECRET=$JWT_SECRET

# Encryption Key (must be 64 characters hex string)
CREDENTIAL_ENCRYPTION_KEY=$CREDENTIAL_ENCRYPTION_KEY

# URLs (REPLACE WITH YOUR ACTUAL DOMAINS)
FRONTEND_URL=https://your-app.yourdomain.com
VITE_API_URL=https://api.your-app.yourdomain.com

# CORS Origins (REPLACE WITH YOUR ACTUAL DOMAINS)
CORS_ORIGIN=https://your-app.yourdomain.com,https://api.your-app.yourdomain.com,https://www.your-app.yourdomain.com
EOF

echo -e "   ✅ Environment template created: .env.coolify.generated"

# Deployment instructions
echo -e "${YELLOW}4. Next Steps for Coolify Deployment:${NC}"
echo "======================================"
echo "1. 📋 Copy the generated secrets above to your Coolify environment variables"
echo "2. 🌐 Replace 'your-app.yourdomain.com' with your actual domain names"
echo "3. 📁 Push this repository to your Git provider"
echo "4. 🚀 Create new application in Coolify:"
echo "   - Build Pack: Docker Compose"
echo "   - Compose File: docker-compose.yml (uses existing production file)"
echo "   - Set environment variables from .env.coolify.generated"
echo "5. 🔗 Configure domains:"
echo "   - Frontend: your-app.yourdomain.com (port 3000)"
echo "   - Backend: api.your-app.yourdomain.com (port 4000)"
echo "6. 🚀 Deploy!"

echo -e "${GREEN}✅ Coolify setup complete!${NC}"
echo -e "${YELLOW}📖 Read COOLIFY_DEPLOYMENT.md for detailed instructions${NC}"

# Security reminder
echo -e "${RED}🔒 SECURITY REMINDER:${NC}"
echo "- Never commit .env.coolify.generated to version control"
echo "- Store secrets securely in Coolify environment variables"
echo "- Use strong, unique passwords for production"
echo "- Enable SSL/HTTPS for all domains"