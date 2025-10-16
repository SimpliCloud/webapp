#!/bin/bash
set -e

echo "Setting up web application..."

# Debug: Show what's in /tmp
echo "Contents of /tmp:"
ls -la /tmp/

# The files are directly in /tmp/ (not in a subdirectory)
SOURCE_DIR="/tmp"

# Verify package.json exists
if [ ! -f "$SOURCE_DIR/package.json" ]; then
    echo "Error: package.json not found in $SOURCE_DIR"
    exit 1
fi

echo "Using source directory: $SOURCE_DIR"

# Copy application files as root (excluding system directories)
sudo cp -r $SOURCE_DIR/config /opt/csye6225/webapp/ || true
sudo cp -r $SOURCE_DIR/middleware /opt/csye6225/webapp/ || true
sudo cp -r $SOURCE_DIR/models /opt/csye6225/webapp/ || true
sudo cp -r $SOURCE_DIR/routes /opt/csye6225/webapp/ || true
sudo cp -r $SOURCE_DIR/node_modules /opt/csye6225/webapp/ || true
sudo cp $SOURCE_DIR/package*.json /opt/csye6225/webapp/ || true
sudo cp $SOURCE_DIR/server.js /opt/csye6225/webapp/ || true
sudo cp $SOURCE_DIR/jest.config.js /opt/csye6225/webapp/ || true

# Install application dependencies as root first
cd /opt/csye6225/webapp
sudo npm ci --production

# Create production .env file
sudo tee /opt/csye6225/webapp/.env > /dev/null <<EOF
NODE_ENV=production
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=health_check_db
DB_USER=csye6225
DB_PASS=MyPassword@123
DB_DIALECT=mysql
EOF

# Set correct ownership for everything
sudo chown -R csye6225:csye6225 /opt/csye6225

# Set proper permissions
sudo chmod 750 /opt/csye6225
sudo chmod 750 /opt/csye6225/webapp
sudo find /opt/csye6225/webapp -type f -exec chmod 640 {} \;
sudo find /opt/csye6225/webapp -type d -exec chmod 750 {} \;
sudo chmod 600 /opt/csye6225/webapp/.env

echo "Application setup completed"