#!/bin/bash
set -e

echo "Installing Node.js 20.x LTS..."

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node_version=$(node -v)
npm_version=$(npm -v)
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

echo "Node.js installation completed"