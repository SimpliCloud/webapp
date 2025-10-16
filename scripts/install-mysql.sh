#!/bin/bash
set -e

echo "Installing MySQL Server..."

# Install MySQL Server without prompts
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

echo "Configuring MySQL..."

# Use sudo to access MySQL without password initially

sudo mysql <<EOF
-- Change root authentication method and set password
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Root@123';

-- Remove anonymous users
DELETE FROM mysql.user WHERE User='';

-- Disallow root login remotely
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Remove test database
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

-- Create application database
CREATE DATABASE IF NOT EXISTS health_check_db;

-- Create application user
CREATE USER IF NOT EXISTS 'csye6225'@'localhost' IDENTIFIED BY 'MyPassword@123';

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON health_check_db.* TO 'csye6225'@'localhost';

-- Apply privilege changes
FLUSH PRIVILEGES;
EOF

echo "MySQL installation and configuration completed successfully"