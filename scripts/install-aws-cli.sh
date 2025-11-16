#!/bin/bash
set -e

echo "Installing AWS CLI v2..."

# Download AWS CLI installer
cd /tmp
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Install unzip if not present...
sudo apt-get update -qq
sudo apt-get install -y unzip

# Unzip and install
unzip -q awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version

# Clean up
rm -rf aws awscliv2.zip

echo "✓ AWS CLI installed successfully"