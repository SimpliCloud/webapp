#!/bin/bash
set -e

echo "Setting up web application..."

# Clean and prepare application directory
sudo rm -rf /opt/csye6225/*
sudo mkdir -p /opt/csye6225/logs
sudo mkdir -p /opt/csye6225/webapp

# Copy application files from /tmp
echo "Copying application files..."
sudo cp -r /tmp/*.js /opt/csye6225/webapp/ 2>/dev/null || true
sudo cp -r /tmp/*.json /opt/csye6225/webapp/ 2>/dev/null || true
sudo cp -r /tmp/config /opt/csye6225/webapp/ 2>/dev/null || true
sudo cp -r /tmp/middleware /opt/csye6225/webapp/ 2>/dev/null || true
sudo cp -r /tmp/models /opt/csye6225/webapp/ 2>/dev/null || true
sudo cp -r /tmp/routes /opt/csye6225/webapp/ 2>/dev/null || true

# Create a placeholder .env file that will be replaced by user data
echo "Creating placeholder .env file..."
sudo tee /opt/csye6225/webapp/.env > /dev/null << 'EOF'
NODE_ENV=production
PORT=8080
# Database configuration will be added by user data script
EOF

# Ensure log directory exists and has correct permissions
echo "Setting up log directory..."
sudo mkdir -p /opt/csye6225/logs
sudo touch /opt/csye6225/logs/webapp.log
sudo touch /opt/csye6225/logs/webapp-error.log
sudo touch /opt/csye6225/logs/exceptions.log
sudo touch /opt/csye6225/logs/rejections.log

# Set ownership AFTER all file operations
echo "Setting file permissions..."
sudo chown -R csye6225:csye6225 /opt/csye6225

# Install dependencies - run as csye6225 user
echo "Installing Node.js dependencies..."
sudo bash -c "cd /opt/csye6225/webapp && sudo -u csye6225 npm ci --only=production"

echo "✓ Application setup completed successfully"