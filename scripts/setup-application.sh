#!/bin/bash
set -e

echo "Setting up web application..."

# Copy application files
sudo cp -r /tmp/webapp/* /opt/csye6225/webapp/ || true
sudo cp -r /tmp/webapp/.[^.]* /opt/csye6225/webapp/ 2>/dev/null || true

# Remove unnecessary files
sudo rm -rf /opt/csye6225/webapp/.git
sudo rm -rf /opt/csye6225/webapp/packer
sudo rm -rf /opt/csye6225/webapp/scripts
sudo rm -rf /opt/csye6225/webapp/.github
sudo rm -f /opt/csye6225/webapp/.gitignore

# Install application dependencies
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

# Set correct ownership
sudo chown -R csye6225:csye6225 /opt/csye6225

# Set proper permissions
sudo chmod 750 /opt/csye6225
sudo chmod -R 640 /opt/csye6225/webapp/*
sudo chmod 750 /opt/csye6225/webapp
sudo chmod 600 /opt/csye6225/webapp/.env

echo "Application setup completed"