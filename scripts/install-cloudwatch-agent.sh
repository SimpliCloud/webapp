#!/bin/bash
set -e

echo "Installing CloudWatch Unified Agent..."

# Download CloudWatch agent for Ubuntu/Debian (AMD64)
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb -O /tmp/amazon-cloudwatch-agent.deb

# Install the agent
sudo dpkg -i /tmp/amazon-cloudwatch-agent.deb

# Verify installation
if [ -f /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl ]; then
    echo "✓ CloudWatch agent installed successfully"
    # Get version using status command instead of -version
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status || echo "Agent not running yet (expected)"
else
    echo "✗ CloudWatch agent installation failed"
    exit 1
fi

# Clean up
rm -f /tmp/amazon-cloudwatch-agent.deb

echo "CloudWatch agent installation completed"