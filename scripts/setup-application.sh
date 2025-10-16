#!/bin/bash
set -e

echo "Setting up web application..."

# Debug: Show what's in /tmp
echo "Contents of /tmp:"
ls -la /tmp/

# The files should be in /tmp/webapp-fork since that's the repo name
SOURCE_DIR="/tmp/webapp-fork"

# Check if the directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: $SOURCE_DIR does not exist"
    echo "Looking for any directory with package.json..."
    SOURCE_DIR=$(find /tmp -maxdepth 1 -type d -exec test -f {}/package.json \; -print | head -n1)
    
    if [ -z "$SOURCE_DIR" ]; then
        echo "Error: Could not find webapp files"
        exit 1
    fi
fi

echo "Using source directory: $SOURCE_DIR"

# Copy application files as root
sudo cp -r $SOURCE_DIR/* /opt/csye6225/webapp/ || true
sudo cp -r $SOURCE_DIR/.[^.]* /opt/csye6225/webapp/ 2>/dev/null || true

# Remove unnecessary files
sudo rm -rf /opt/csye6225/webapp/.git
sudo rm -rf /opt/csye6225/webapp/packer
sudo rm -rf /opt/csye6225/webapp/scripts
sudo rm -rf /opt/csye6225/webapp/.github
sudo rm -f /opt/csye6225/webapp/.gitignore
sudo rm -rf /opt/csye6225/webapp/tests
sudo rm -rf /opt/csye6225/webapp/coverage
sudo rm -f /opt/csye6225/webapp/setup.sh
sudo rm -f /opt/csye6225/webapp/jest.config.js

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
sudo chmod -R 640 /opt/csye6225/webapp/*
sudo chmod 750 /opt/csye6225/webapp/node_modules
sudo chmod 600 /opt/csye6225/webapp/.env

# Make directories executable
find /opt/csye6225/webapp -type d -exec sudo chmod 750 {} \;

echo "Application setup completed"