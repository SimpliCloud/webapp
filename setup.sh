#!/bin/bash

# CSYE 6225 - Health Check API Application Setup Script
# This script sets up the environment for the Node.js Health Check API with MySQL on Ubuntu 24.04 LTS
# Application: health-check-api v2.0.0

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

log_info "Starting CSYE 6225 Health Check API Setup..."

# 1. Update Package Lists
log_info "Updating package lists..."
apt-get update -y

# 2. Upgrade System Packages
log_info "Upgrading system packages..."
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# 3. Install MySQL Server and Client
log_info "Installing MySQL Server..."
DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server mysql-client

# Start and enable MySQL service
systemctl start mysql
systemctl enable mysql
log_info "MySQL service started and enabled"

# 4. Create Application Database
log_info "Setting up MySQL database for Health Check API..."

# Generate a secure password for MySQL user
DB_PASSWORD=$(openssl rand -base64 16)
DB_NAME="csye6225_db"
DB_USER="csye6225_user"
DB_PORT="3306"

# Create database and user with proper UTF-8 support for your app
mysql << EOF
-- Create database with UTF-8 support (as required by your app)
CREATE DATABASE IF NOT EXISTS ${DB_NAME} 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';

-- Apply privilege changes
FLUSH PRIVILEGES;
EOF

log_info "Database '${DB_NAME}' created with UTF-8 support"
log_info "Database user '${DB_USER}' created successfully"

# 5. Create Application Linux Group
log_info "Creating application group..."
if ! getent group csye6225 > /dev/null 2>&1; then
    groupadd csye6225
    log_info "Group 'csye6225' created"
else
    log_warning "Group 'csye6225' already exists"
fi

# 6. Create Application User Account
log_info "Creating application user..."
if ! id -u csye6225 > /dev/null 2>&1; then
    # Create system user with home directory for PM2
    useradd -r -m -g csye6225 -s /bin/bash csye6225
    log_info "User 'csye6225' created"
else
    log_warning "User 'csye6225' already exists"
fi

# 7. Deploy Application Files
log_info "Setting up application directory..."

# Create application directory
mkdir -p /opt/csye6225
log_info "Application directory /opt/csye6225 created"

# Install Node.js 20.x LTS (your app requires Node >= 18.0.0)
log_info "Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install additional build tools needed for npm packages (especially bcrypt)
apt-get install -y build-essential python3

# Install unzip for extracting application files
apt-get install -y unzip git

log_info "Node.js $(node --version) and npm $(npm --version) installed"

# Create application structure
mkdir -p /opt/csye6225/{config,models,controllers,routes,tests,middleware,utils}

# Create the production .env file with secure database credentials
cat > /opt/csye6225/.env << EOF
# Application Environment
NODE_ENV=production
PORT=8080

# Database Configuration
DB_HOST=localhost
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASSWORD}

# Database Connection Pool (optimized for production)
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# BCrypt Configuration
BCRYPT_SALT_ROUNDS=10
EOF

# Secure the .env file
chmod 600 /opt/csye6225/.env
log_info "Environment configuration created"

# Create a deployment instruction file
cat > /opt/csye6225/DEPLOYMENT.md << 'EOF'
# Health Check API Deployment Instructions

## Application: health-check-api v2.0.0

### To deploy your application:

1. **Copy your application files to this directory:**
   ```bash
   # Option 1: Using git
   cd /opt/csye6225
   git clone https://github.com/Vatsal-Naik-CSYE-6225/webapp.git .
   
   # Option 2: Using zip file
   unzip your-app.zip -d /opt/csye6225/
   ```

2. **Install dependencies:**
   ```bash
   cd /opt/csye6225
   npm install --production
   ```

3. **Verify database connection:**
   ```bash
   npm start
   # Check for "✓ Database connected." message
   ```

4. **Set up PM2 for process management:**
   ```bash
   # Start the application
   pm2 start server.js --name health-check-api
   
   # Save PM2 configuration
   pm2 save
   
   # Enable PM2 startup on boot
   pm2 startup
   ```

5. **Verify the application is running:**
   ```bash
   # Check application status
   pm2 status
   
   # Check application logs
   pm2 logs health-check-api
   
   # Test health endpoint
   curl http://localhost:8080/healthz
   ```

### API Endpoints:
- Health Check: GET /healthz
- User Management: /v1/users/*
- Product Management: /v1/products/* (if implemented)

### Monitoring:
- Logs: `pm2 logs health-check-api`
- Status: `pm2 status`
- Metrics: `pm2 monit`
EOF

# 8. Set File Permissions
log_info "Setting file permissions..."

# Set ownership of application directory
chown -R csye6225:csye6225 /opt/csye6225

# Set directory permissions (755 = rwxr-xr-x)
find /opt/csye6225 -type d -exec chmod 755 {} \;

# Set file permissions (644 = rw-r--r--) but keep .env secure
find /opt/csye6225 -type f -exec chmod 644 {} \;
chmod 600 /opt/csye6225/.env

log_info "Permissions set for /opt/csye6225"

# Install PM2 globally for process management
log_info "Installing PM2 for Node.js process management..."
npm install -g pm2

# Configure PM2 to run as csye6225 user
su - csye6225 -c "pm2 startup systemd -u csye6225 --hp /home/csye6225" | tail -n 1 | bash

# Create PM2 ecosystem file for the application
cat > /opt/csye6225/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'health-check-api',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/csye6225/error.log',
    out_file: '/var/log/csye6225/out.log',
    log_file: '/var/log/csye6225/combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF

# Create log directory
mkdir -p /var/log/csye6225
chown -R csye6225:csye6225 /var/log/csye6225

# Set up log rotation
cat > /etc/logrotate.d/csye6225 << EOF
/var/log/csye6225/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 csye6225 csye6225
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create a systemd service file (alternative to PM2 if needed)
cat > /etc/systemd/system/health-check-api.service << EOF
[Unit]
Description=CSYE6225 Health Check API
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=csye6225
Group=csye6225
WorkingDirectory=/opt/csye6225
ExecStart=/usr/bin/node /opt/csye6225/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=append:/var/log/csye6225/app.log
StandardError=append:/var/log/csye6225/error.log

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Save database credentials to a secure file
cat > /opt/csye6225_db_config.txt << EOF
# Database Configuration for Health Check API
# Keep this file secure!
DB_HOST=localhost
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Connection string for manual testing:
mysql -h localhost -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}
EOF
chmod 600 /opt/csye6225_db_config.txt
chown csye6225:csye6225 /opt/csye6225_db_config.txt

# Final summary
echo ""
log_info "==========================================="
log_info "Health Check API Setup Complete!"
log_info "==========================================="
log_info "Application Details:"
log_info "  - Application: health-check-api v2.0.0"
log_info "  - Node.js: $(node --version)"
log_info "  - npm: $(npm --version)"
log_info "  - Port: 8080"
log_info ""
log_info "Database Configuration:"
log_info "  - Host: localhost"
log_info "  - Port: ${DB_PORT}"
log_info "  - Database: ${DB_NAME}"
log_info "  - User: ${DB_USER}"
log_info "  - Charset: utf8mb4 (full UTF-8 support)"
log_info ""
log_info "System Configuration:"
log_info "  - User: csye6225"
log_info "  - Group: csye6225"
log_info "  - App Directory: /opt/csye6225"
log_info "  - Log Directory: /var/log/csye6225"
log_info "  - PM2 installed for process management"
log_info ""
log_info "Next Steps:"
log_info "  1. Deploy your application code to /opt/csye6225/"
log_info "  2. Run: cd /opt/csye6225 && npm install --production"
log_info "  3. Start with PM2: pm2 start server.js --name health-check-api"
log_info "  4. Test: curl http://localhost:8080/healthz"
log_info ""
log_info "Important Files:"
log_info "  - Environment: /opt/csye6225/.env"
log_info "  - DB Credentials: /opt/csye6225_db_config.txt"
log_info "  - Deployment Guide: /opt/csye6225/DEPLOYMENT.md"
log_info "  - PM2 Config: /opt/csye6225/ecosystem.config.js"
log_info "==========================================="