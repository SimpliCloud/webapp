#!/bin/bash
set -e

echo "Setting up web application..."

# Clean and prepare application directory
sudo rm -rf /opt/csye6225/*
sudo mkdir -p /opt/csye6225/logs

# Copy application files from /tmp
echo "Copying application files..."
sudo cp -r /tmp/*.js /opt/csye6225/ 2>/dev/null || true
sudo cp -r /tmp/*.json /opt/csye6225/ 2>/dev/null || true
sudo cp -r /tmp/config /opt/csye6225/ 2>/dev/null || true
sudo cp -r /tmp/middleware /opt/csye6225/ 2>/dev/null || true
sudo cp -r /tmp/models /opt/csye6225/ 2>/dev/null || true
sudo cp -r /tmp/routes /opt/csye6225/ 2>/dev/null || true

# Create production .env file
sudo tee /opt/csye6225/.env > /dev/null << 'EOF'
NODE_ENV=production
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=health_check_db
DB_USER=csye6225
DB_PASS=MyPassword@123
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
BCRYPT_SALT_ROUNDS=10
EOF

# Set ownership AFTER all file operations
sudo chown -R csye6225:csye6225 /opt/csye6225

# Install dependencies using sudo to run as csye6225
cd /opt/csye6225
sudo -u csye6225 npm ci --only=production

echo "Application setup completed"