#!/bin/bash
set -e

echo "Creating csye6225 user and group..."

# Create group
sudo groupadd -f csye6225

# Create user with no login shell
sudo useradd -r -g csye6225 -s /usr/sbin/nologin -d /opt/csye6225 -m csye6225 || true

# Create application directory structure
sudo mkdir -p /opt/csye6225/webapp
sudo mkdir -p /opt/csye6225/logs

# Set ownership
sudo chown -R csye6225:csye6225 /opt/csye6225

echo "User and directory setup completed"