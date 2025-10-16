#!/bin/bash
set -e

echo "Installing MySQL Server...."

# Install MySQL
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Root@123';"
sudo mysql -e "DELETE FROM mysql.user WHERE User='';"
sudo mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
sudo mysql -e "DROP DATABASE IF EXISTS test;"
sudo mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"

# Create application database and user
sudo mysql -u root -pRoot@123 <<EOF
CREATE DATABASE IF NOT EXISTS health_check_db;
CREATE USER IF NOT EXISTS 'csye6225'@'localhost' IDENTIFIED BY 'MyPassword@123';
GRANT ALL PRIVILEGES ON health_check_db.* TO 'csye6225'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "MySQL installation and configuration completed"