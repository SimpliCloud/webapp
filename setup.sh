#!/bin/bash

# CSYE 6225 - Health Check API Complete Deployment Script
# Fixed version - handles MySQL auth without root password issues
# For Ubuntu 24.04 LTS

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

log_info "Starting CSYE 6225 Health Check API Deployment..."

# 1. Update Package Lists
log_info "Step 1: Updating package lists..."
apt-get update -y

# 2. Upgrade System Packages (with non-interactive mode)
log_info "Step 2: Upgrading system packages..."
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# 3. Install MySQL Server and Required Tools
log_info "Step 3: Installing MySQL Server and tools..."
apt-get install -y mysql-server mysql-client unzip git curl build-essential python3

# Start and enable MySQL service
systemctl start mysql
systemctl enable mysql
log_info "MySQL service started and enabled"

# 4. Create Application Database (using sudo mysql for root access)
log_info "Step 4: Setting up MySQL database..."

# Database credentials
DB_NAME="health_check_db"
DB_USER="csye6225_user"
DB_PASSWORD="CSye6225Pass!"

# Create database and user using sudo mysql (no root password needed)
sudo mysql << EOF
-- Create database with UTF-8 support
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

log_info "Database '${DB_NAME}' created successfully"
log_info "Database user '${DB_USER}' configured"

# Test database connection
mysql -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME}; SELECT 1;" > /dev/null 2>&1 && log_info "Database connection verified" || log_warning "Database connection test failed"

# 5. Create Application Group and User
log_info "Step 5: Creating application user and group..."
groupadd -f csye6225
if ! id -u csye6225 > /dev/null 2>&1; then
    useradd -r -m -g csye6225 -s /bin/bash csye6225
    log_info "User 'csye6225' created"
else
    log_warning "User 'csye6225' already exists"
fi

# 6. Install Node.js 20.x LTS
log_info "Step 6: Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

log_info "Installed Node.js $(node --version) and npm $(npm --version)"

# 7. Create Application Directory
log_info "Step 7: Creating application directories..."
mkdir -p /opt/csye6225
mkdir -p /opt/csye6225/logs

# 8. Deploy Application Files
log_info "Step 8: Deploying application files..."
DEPLOYED=false

# Method 1: Check if running from cloned repository
if [ -f "./package.json" ]; then
    log_info "Found application in current directory, copying files..."
    for file in *; do
        if [ "$file" != "setup.sh" ]; then
            cp -r "$file" /opt/csye6225/
        fi  
    done
    cp -r .[^.]* /opt/csye6225/ 2>/dev/null || true
    DEPLOYED=true
elif [ -f "./health-check-api/package.json" ]; then
    log_info "Found application in health-check-api subdirectory, copying files..."
    cp -r ./health-check-api/* /opt/csye6225/
    cp -r ./health-check-api/.[^.]* /opt/csye6225/ 2>/dev/null || true
    DEPLOYED=true

# Method 2: Check for webapp.zip
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
else
    log_info "Cloning from GitHub repository..."
    git clone https://github.com/Vatsal-Naik-CSYE-6225/webapp.git /tmp/webapp 2>/dev/null || {
        log_error "Failed to clone repository. Please ensure:"
        log_error "  1. You're running from the webapp directory, OR"
        log_error "  2. Upload webapp.zip to $HOME/, OR"
        log_error "  3. The GitHub repository is accessible"
        exit 1
    }
    
    if [ -d "/tmp/webapp/health-check-api" ]; then
        cp -r /tmp/webapp/health-check-api/* /opt/csye6225/
        cp -r /tmp/webapp/health-check-api/.[^.]* /opt/csye6225/ 2>/dev/null || true
    else
        cp -r /tmp/webapp/* /opt/csye6225/
    fi
    rm -rf /tmp/webapp
    DEPLOYED=true
fi

if [ "$DEPLOYED" = false ]; then
    log_error "Failed to deploy application files!"
    exit 1
fi

# Clean up Mac/Windows artifacts
find /opt/csye6225 -name ".DS_Store" -delete 2>/dev/null || true
rm -rf /opt/csye6225/__MACOSX 2>/dev/null || true

log_info "Application files deployed successfully"

# 9. Create Environment Configuration
log_info "Step 9: Creating environment configuration..."
cat > /opt/csye6225/.env << EOF
# Application Environment
NODE_ENV=production
PORT=8080

# Database Configuration
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

log_info "Environment configuration created"

# 10. Set File Permissions
log_info "Step 10: Setting file permissions..."
chown -R csye6225:csye6225 /opt/csye6225
find /opt/csye6225 -type d -exec chmod 755 {} \;
find /opt/csye6225 -type f -exec chmod 644 {} \;
chmod 600 /opt/csye6225/.env

# 11. Install Application Dependencies
log_info "Step 11: Installing npm dependencies..."
cd /opt/csye6225

if [ ! -f "package.json" ]; then
    log_error "package.json not found in /opt/csye6225/"
    exit 1
fi

# Install dependencies as csye6225 user
sudo -u csye6225 npm ci --only=production 2>/dev/null || {
    log_warning "npm ci failed, using npm install..."
    sudo -u csye6225 npm cache clean --force
    sudo -u csye6225 npm install --production
}

log_info "Dependencies installed successfully"

# 12. Create Systemd Service
log_info "Step 12: Creating systemd service..."
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
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
EnvironmentFile=/opt/csye6225/.env

[Install]
WantedBy=multi-user.target
EOF

# 13. Install PM2 (optional, as backup)
log_info "Step 13: Installing PM2..."
npm install -g pm2 2>/dev/null || log_warning "PM2 installation skipped"

# 14. Start the Application
log_info "Step 14: Starting application service..."
systemctl daemon-reload
systemctl enable csye6225-webapp.service
systemctl start csye6225-webapp.service

# Wait for application to start
log_info "Waiting for application to initialize..."
sleep 8

# 15. Test Health Endpoint
log_info "Step 15: Testing health endpoint..."
SUCCESS=false

for i in {1..20}; do
    if curl -s -f http://localhost:8080/healthz > /dev/null 2>&1; then
        SUCCESS=true
        echo ""
        log_info "✅ SUCCESS: Health endpoint is responding!"
        echo ""
        
        # Show response
        log_info "Health check response:"
        curl -s http://localhost:8080/healthz | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/healthz
        echo ""
        break
    else
        if [ $i -eq 20 ]; then
            log_error "❌ Health endpoint not responding after 20 attempts"
            echo ""
            log_warning "Troubleshooting info:"
            systemctl status csye6225-webapp.service --no-pager | head -20
            echo ""
            journalctl -u csye6225-webapp.service -n 30 --no-pager
            echo ""
            log_info "Check logs with: journalctl -u csye6225-webapp -f"
            exit 1
        fi
        echo -n "."
        sleep 2
    fi
done

if [ "$SUCCESS" = true ]; then
    echo ""
    echo "=============================================="
    echo "   🎉 DEPLOYMENT SUCCESSFUL! 🎉"
    echo "=============================================="
    echo ""
    echo "📊 Application: Health Check API"
    echo "🌐 Port: 8080"
    echo "📁 Directory: /opt/csye6225"
    echo "👤 User: csye6225"
    echo "🗄️ Database: ${DB_NAME}"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • Status: systemctl status csye6225-webapp"
    echo "  • Logs: journalctl -u csye6225-webapp -f"
    echo "  • Restart: systemctl restart csye6225-webapp"
    echo ""
    echo "🧪 Test Commands:"
    echo "  • Health: curl http://localhost:8080/healthz"
    echo "  • External: curl http://$(curl -s ifconfig.me):8080/healthz"
    echo ""
    echo "=============================================="
fi