#!/bin/bash
set -e

echo "Setting up web application..."

# Check what's in /tmp
echo "Contents of /tmp:"
ls -la /tmp

# Create the application directory
sudo mkdir -p /opt/csye6225

# Copy application files from /tmp to /opt/csye6225
sudo cp -r /tmp/* /opt/csye6225/ || true
sudo cp -r /tmp/.[^.]* /opt/csye6225/ 2>/dev/null || true

# Remove unnecessary files
sudo rm -rf /opt/csye6225/node_modules 2>/dev/null || true
sudo rm -rf /opt/csye6225/packer 2>/dev/null || true

# Set ownership BEFORE trying to access
sudo chown -R csye6225:csye6225 /opt/csye6225

# Now you can work in the directory
cd /opt/csye6225

# Install dependencies as csye6225 user
sudo -u csye6225 npm ci --only=production

# Create systemd service file
sudo tee /etc/systemd/system/csye6225-webapp.service > /dev/null << 'EOF'
[Unit]
Description=CSYE6225 Web Application
After=network.target mysql.service

[Service]
Type=simple
User=csye6225
Group=csye6225
WorkingDirectory=/opt/csye6225
ExecStart=/usr/bin/node server.js
Restart=always
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable csye6225-webapp.service

echo "Application setup completed"