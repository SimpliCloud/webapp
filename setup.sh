#!/bin/bash

# CSYE 6225 - Health Check API Complete Deployment Script
# This script automates everything: setup + deployment + testing
# For Ubuntu 24.04 LTS on Digital Ocean or AWS EC2
# Specifically configured for MySQL + Sequelize with auto-sync

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

log_info "Starting CSYE 6225 Health Check API Complete Deployment..."
log_info "Application: Node.js + Express + MySQL + Sequelize"

# 1. Update Package Lists
log_info "Step 1/15: Updating package lists..."
apt-get update -y

# 2. Upgrade System Packages
log_info "Step 2/15: Upgrading system packages..."
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# 3. Install MySQL Server and Required Tools
log_info "Step 3/15: Installing MySQL Server and tools..."
DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server mysql-client unzip git curl

# Start and enable MySQL service
systemctl start mysql
systemctl enable mysql
log_info "MySQL service started and enabled"

# 4. Create Application Database
log_info "Step 4/15: Setting up MySQL database..."

# Database credentials (matching your .env file structure)
DB_NAME="health_check_db"
DB_USER="csye6225_user"
DB_PASSWORD="CSye6225Pass!"  # Strong password for production
DB_ROOT_PASS="RootPass123!"    # Set root password for security

# Secure MySQL installation and create database
mysql << EOF
-- Set root password
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASS}';

-- Create database with UTF-8 support (matching your database.js charset)
CREATE DATABASE IF NOT EXISTS ${DB_NAME} 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
EOF

log_info "Database '${DB_NAME}' created with UTF-8MB4 support"
log_info "Database user '${DB_USER}' configured successfully"

# 5. Create Application Group and User
log_info "Step 5/15: Creating application user and group..."
groupadd -f csye6225
if ! id -u csye6225 > /dev/null 2>&1; then
    useradd -r -m -g csye6225 -s /bin/bash csye6225
    log_info "User 'csye6225' created"
else
    log_warning "User 'csye6225' already exists"
fi

# Ensure home directory exists for npm operations
mkdir -p /home/csye6225
chown csye6225:csye6225 /home/csye6225
chmod 755 /home/csye6225

# 6. Install Node.js 20.x LTS (meets your >=18.0.0 requirement)
log_info "Step 6/15: Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential python3

log_info "Installed Node.js $(node --version) and npm $(npm --version)"

# 7. Create Application Directory Structure
log_info "Step 7/15: Creating application directories..."
mkdir -p /opt/csye6225
mkdir -p /opt/csye6225/logs
mkdir -p /opt/csye6225/config

# 8. Deploy Application Files
log_info "Step 8/15: Deploying application files..."
DEPLOYED=false

# Method 1: Check if we're running from the cloned repository
if [ -f "./health-check-api/package.json" ]; then
    log_info "Found application in current directory, copying files..."
    cp -r ./health-check-api/* /opt/csye6225/
    cp -r ./health-check-api/.[^.]* /opt/csye6225/ 2>/dev/null || true
    DEPLOYED=true

# Method 2: Check for webapp.zip in home directory
elif [ -f "$HOME/webapp.zip" ]; then
    log_info "Found webapp.zip, extracting..."
    cd /opt/csye6225
    unzip -q -o "$HOME/webapp.zip"
    
    # Handle nested directories
    if [ -d "webapp/health-check-api" ]; then
        mv webapp/health-check-api/* .
        mv webapp/health-check-api/.[^.]* . 2>/dev/null || true
        rm -rf webapp
    elif [ -d "health-check-api" ]; then
        mv health-check-api/* .
        mv health-check-api/.[^.]* . 2>/dev/null || true
        rm -rf health-check-api
    fi
    DEPLOYED=true

# Method 3: Clone from GitHub
elif [ -n "$GIT_REPO" ]; then
    log_info "Cloning from repository: $GIT_REPO"
    git clone "$GIT_REPO" /tmp/webapp
    if [ -d "/tmp/webapp/health-check-api" ]; then
        cp -r /tmp/webapp/health-check-api/* /opt/csye6225/
        cp -r /tmp/webapp/health-check-api/.[^.]* /opt/csye6225/ 2>/dev/null || true
    else
        cp -r /tmp/webapp/* /opt/csye6225/
    fi
    rm -rf /tmp/webapp
    DEPLOYED=true

# Method 4: Direct git clone
else
    log_info "Attempting to clone from default repository..."
    git clone https://github.com/Vatsal-Naik-CSYE-6225/webapp.git /tmp/webapp 2>/dev/null || true
    if [ -d "/tmp/webapp/health-check-api" ]; then
        cp -r /tmp/webapp/health-check-api/* /opt/csye6225/
        cp -r /tmp/webapp/health-check-api/.[^.]* /opt/csye6225/ 2>/dev/null || true
        rm -rf /tmp/webapp
        DEPLOYED=true
    fi
fi

if [ "$DEPLOYED" = false ]; then
    log_error "No application files found! Please use one of these methods:"
    log_error "  1. Run this script from your webapp directory"
    log_error "  2. Upload webapp.zip to $HOME/"
    log_error "  3. Set GIT_REPO environment variable"
    log_error "  Example: GIT_REPO='https://github.com/your/repo.git' sudo bash setup.sh"
    exit 1
fi

# Clean up any artifacts
rm -rf /opt/csye6225/__MACOSX 2>/dev/null || true
find /opt/csye6225 -name ".DS_Store" -delete 2>/dev/null || true

log_info "Application files deployed successfully"

# 9. Setup Environment Configuration
log_info "Step 9/15: Configuring environment variables..."

# Check for existing .env file or create one
if [ -f "$HOME/.env" ]; then
    cp "$HOME/.env" /opt/csye6225/.env
    log_info "Using custom .env from $HOME/"
elif [ -f "/opt/csye6225/.env" ]; then
    log_info "Using existing .env from application"
    # Update database credentials in existing .env
    sed -i "s/DB_USER=.*/DB_USER=${DB_USER}/" /opt/csye6225/.env
    sed -i "s/DB_PASS=.*/DB_PASS=${DB_PASSWORD}/" /opt/csye6225/.env
    sed -i "s/DB_NAME=.*/DB_NAME=${DB_NAME}/" /opt/csye6225/.env
else
    log_info "Creating production .env file..."
    cat > /opt/csye6225/.env << EOF
# Application Environment
NODE_ENV=production
PORT=8080

# Database Configuration (matching your database.js requirements)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASSWORD}

# Database Connection Pool
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# BCrypt Configuration
BCRYPT_SALT_ROUNDS=10
EOF
fi

# 10. Set File Permissions
log_info "Step 10/15: Setting file permissions..."
chown -R csye6225:csye6225 /opt/csye6225
find /opt/csye6225 -type d -exec chmod 755 {} \;
find /opt/csye6225 -type f -exec chmod 644 {} \;
chmod 600 /opt/csye6225/.env  # Secure the environment file
if [ -f /opt/csye6225/server.js ]; then
    chmod 755 /opt/csye6225/server.js  # Make server.js executable
fi

# 11. Install Application Dependencies
log_info "Step 11/15: Installing npm dependencies (production only)..."
cd /opt/csye6225

# Verify package.json exists
if [ ! -f "package.json" ]; then
    log_error "package.json not found in /opt/csye6225/"
    log_error "Application files may not have been deployed correctly"
    exit 1
fi

# Install dependencies with retry logic
sudo -u csye6225 npm ci --only=production 2>/dev/null || {
    log_warning "npm ci failed, trying npm install..."
    sudo -u csye6225 npm cache clean --force
    sudo -u csye6225 npm install --production
}

log_info "Dependencies installed successfully"

# 12. Database Tables Setup (Sequelize Auto-Sync)
log_info "Step 12/15: Database tables configuration..."
log_info "Tables will be auto-created by Sequelize when application starts"
log_info "Using sequelize.sync() with alter mode for development"

# 13. Create Systemd Service
log_info "Step 13/15: Creating systemd service..."
cat > /etc/systemd/system/csye6225-webapp.service << EOF
[Unit]
Description=CSYE6225 Health Check API
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=csye6225
Group=csye6225
WorkingDirectory=/opt/csye6225
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/csye6225/logs/app.log
StandardError=append:/opt/csye6225/logs/error.log

# Environment
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
EnvironmentFile=/opt/csye6225/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/csye6225

# Resource limits
LimitNOFILE=65536
LimitNPROC=512

[Install]
WantedBy=multi-user.target
EOF

# Also install PM2 as an alternative/backup
log_info "Installing PM2 for additional process management..."
npm install -g pm2
su - csye6225 -c "pm2 startup systemd -u csye6225 --hp /home/csye6225" | tail -n 1 | bash 2>/dev/null || true

# Create PM2 ecosystem file
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
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/opt/csye6225/logs/pm2-error.log',
    out_file: '/opt/csye6225/logs/pm2-out.log',
    merge_logs: true,
    time: true
  }]
};
EOF
chown csye6225:csye6225 /opt/csye6225/ecosystem.config.js

# 14. Start the Application Service
log_info "Step 14/15: Starting application service..."
systemctl daemon-reload
systemctl enable csye6225-webapp.service
systemctl start csye6225-webapp.service

# Wait for application to initialize (Sequelize needs time to sync)
log_info "Waiting for application to initialize and create database tables..."
sleep 8

# 15. Test Health Endpoint
log_info "Step 15/15: Testing health endpoint..."
SUCCESS=false
MAX_ATTEMPTS=20

for i in $(seq 1 $MAX_ATTEMPTS); do
    log_info "Health check attempt $i/$MAX_ATTEMPTS..."
    
    # Try to connect to health endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/healthz 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
        SUCCESS=true
        echo ""
        log_info "✅ SUCCESS: Health endpoint is responding!"
        echo ""
        
        # Display the response
        log_info "Health check response:"
        RESPONSE=$(curl -s http://localhost:8080/healthz)
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
        echo ""
        
        # Check if database is connected
        if echo "$RESPONSE" | grep -q "connected"; then
            log_info "✅ Database connection verified!"
        else
            log_warning "⚠️  Application is running but database connection may need attention"
        fi
        break
    else
        if [ $i -eq $MAX_ATTEMPTS ]; then
            log_error "❌ Health endpoint not responding after $MAX_ATTEMPTS attempts"
            
            # Detailed troubleshooting
            echo ""
            log_warning "=== TROUBLESHOOTING INFORMATION ==="
            
            echo ""
            log_info "1. Service Status:"
            systemctl status csye6225-webapp.service --no-pager -l | head -20
            
            echo ""
            log_info "2. Application Logs:"
            if [ -f /opt/csye6225/logs/app.log ]; then
                tail -20 /opt/csye6225/logs/app.log
            else
                journalctl -u csye6225-webapp.service -n 20 --no-pager
            fi
            
            echo ""
            log_info "3. Port Status:"
            ss -tlnp | grep :8080 || echo "Port 8080 is not listening"
            
            echo ""
            log_info "4. MySQL Status:"
            systemctl is-active mysql && echo "MySQL is running" || echo "MySQL is not running"
            
            echo ""
            log_info "5. Directory Contents:"
            ls -la /opt/csye6225/ | head -10
            
            echo ""
            log_info "Manual debugging commands:"
            echo "  - Check logs: journalctl -u csye6225-webapp -f"
            echo "  - Test MySQL: mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}"
            echo "  - Start manually: cd /opt/csye6225 && sudo -u csye6225 node server.js"
            echo "  - Check PM2: pm2 list"
            
            exit 1
        fi
        sleep 2
    fi
done

# Final Summary
if [ "$SUCCESS" = true ]; then
    # Save configuration summary
    cat > /opt/csye6225/deployment-info.txt << EOF
Deployment Date: $(date)
Node.js Version: $(node --version)
npm Version: $(npm --version)
MySQL Database: ${DB_NAME}
MySQL User: ${DB_USER}
Application Port: 8080
Application User: csye6225
Application Directory: /opt/csye6225
Log Directory: /opt/csye6225/logs
Service Name: csye6225-webapp.service
EOF
    chown csye6225:csye6225 /opt/csye6225/deployment-info.txt

    echo ""
    echo "=============================================="
    echo "   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
    echo "=============================================="
    echo ""
    log_info "📊 Application Details:"
    echo "  • Name: Health Check API v2.0.0"
    echo "  • Node.js: $(node --version)"
    echo "  • Port: 8080"
    echo "  • Status: ✅ Running"
    echo ""
    log_info "🗄️  Database:"
    echo "  • Type: MySQL with Sequelize ORM"
    echo "  • Database: ${DB_NAME}"
    echo "  • User: ${DB_USER}"
    echo "  • Tables: Auto-created by Sequelize"
    echo ""
    log_info "🛠️  Service Management Commands:"
    echo "  • Status: systemctl status csye6225-webapp"
    echo "  • Logs: journalctl -u csye6225-webapp -f"
    echo "  • Restart: systemctl restart csye6225-webapp"
    echo "  • Stop: systemctl stop csye6225-webapp"
    echo "  • PM2 Status: pm2 status"
    echo "  • PM2 Logs: pm2 logs health-check-api"
    echo ""
    log_info "🔍 Test Your API:"
    echo "  • Health Check: curl http://localhost:8080/healthz"
    echo "  • Create User: curl -X POST -H 'Content-Type: application/json' \\"
    echo "                 -d '{\"email\":\"test@example.com\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}' \\"
    echo "                 http://localhost:8080/v1/user"
    echo ""
    log_info "📁 Important Locations:"
    echo "  • Application: /opt/csye6225/"
    echo "  • Environment: /opt/csye6225/.env"
    echo "  • Logs: /opt/csye6225/logs/"
    echo "  • PM2 Config: /opt/csye6225/ecosystem.config.js"
    echo "  • Deployment Info: /opt/csye6225/deployment-info.txt"
    echo ""
    echo "=============================================="
    echo "   Your Health Check API is ready! 🚀"
    echo "   Access it at: http://$(hostname -I | awk '{print $1}'):8080"
    echo "=============================================="
fi