# Cloud-Native Web Application

RESTful API with automated AMI building, infrastructure as code, and CI/CD pipeline implementation.

## Prerequisites

- Node.js 20.x LTS
- MySQL 8.0 or higher
- Git
- Packer (for AMI building)
- Terraform (for infrastructure deployment)
- AWS CLI configured with appropriate profiles

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Sequelize
- **Authentication**: Basic Auth (Token-based)
- **Password Encryption**: BCrypt
- **Testing**: Jest, SuperTest
- **CI/CD**: GitHub Actions
- **Infrastructure**: Packer, Terraform, AWS

## Repository Structure

```
webapp/
├── .github/
│   └── workflows/
│       ├── packer-status-check.yml  # Packer validation on PR
│       └── packer-build.yml         # AMI build on merge
├── config/
│   └── database.js
├── middleware/
│   ├── auth.js
│   └── validation.js
├── models/
│   ├── index.js
│   ├── User.js
│   ├── Product.js
│   └── HealthCheck.js
├── packer/
│   └── aws-ubuntu.pkr.hcl          # Packer template for AMI
├── routes/
│   ├── health.js
│   ├── users.js
│   └── products.js
├── scripts/
│   ├── install-mysql.sh            # MySQL installation script
│   ├── install-nodejs.sh           # Node.js installation script
│   ├── setup-user.sh               # User creation script
│   ├── setup-application.sh        # Application setup script
│   └── webapp.service              # Systemd service file
├── tests/
│   ├── health.test.js
│   ├── users.test.js
│   ├── products.test.js
│   └── integration/
│       └── api.test.js
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Local Development Setup

### 1. Clone Repository

```bash
git clone git@github.com:yourusername/webapp.git
cd webapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create MySQL database:
```sql
CREATE DATABASE health_check_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'csye6225'@'localhost' IDENTIFIED BY 'MyPassword@123';
GRANT ALL PRIVILEGES ON health_check_db.* TO 'csye6225'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Environment Configuration

Create `.env` file:
```bash
cp .env.example .env
```

Configure variables:
```
NODE_ENV=development
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=health_check_db
DB_USER=csye6225
DB_PASS=MyPassword@123
DB_DIALECT=mysql
```

### 5. Run Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## AMI Building with Packer

### Prerequisites
- AWS CLI configured with dev profile
- Packer installed locally
- GitHub Actions secrets configured

### Build AMI Locally

```bash
cd packer
packer init .
packer validate .
packer build aws-ubuntu.pkr.hcl
```

### Automated AMI Building

AMIs are automatically built via GitHub Actions when PRs are merged to main:
1. Packer format and validation checks run on PR
2. AMI build triggers on merge
3. AMI is shared between dev and demo AWS accounts

### AMI Contents
- Ubuntu 24.04 LTS base
- MySQL 8.0 (local installation)
- Node.js 20.x LTS
- Application code and dependencies
- Systemd service for auto-start
- csye6225 user with nologin shell

## Infrastructure Deployment

Infrastructure is managed in the separate `tf-aws-infra` repository using Terraform.

## API Documentation

### Base URL
```
http://<ec2-public-ip>:8080
```

### Authentication
Protected endpoints require Basic Authentication:
```
Authorization: Basic base64(email:password)
```

### Endpoints

#### Health Check
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /healthz | No | Database connectivity check |

#### User Management  
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /v1/user | No | Create user account |
| GET | /v1/user/self | Yes | Get authenticated user info |
| PUT | /v1/user/self | Yes | Update all user fields |

#### Product Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /v1/product | Yes | Create new product |
| GET | /v1/product/:productId | No | Get product details |
| PUT | /v1/product/:productId | Yes* | Update all product fields |
| PATCH | /v1/product/:productId | Yes* | Update specific fields |
| DELETE | /v1/product/:productId | Yes* | Delete product |

*Owner authorization required

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Resource created |
| 204 | Success (no content) |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 405 | Method not allowed |

## Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
- Unit and integration tests for all endpoints
- GitHub Actions CI runs tests on every PR
- Coverage: ~65% statements

## CI/CD Pipeline

### GitHub Actions Workflows

#### Packer Status Check (`packer-status-check.yml`)
- Triggers: Pull requests modifying packer files
- Validates Packer template formatting
- Validates Packer configuration
- Blocks merge on validation failure

#### AMI Build (`packer-build.yml`)
- Triggers: Merge to main branch
- Runs integration tests
- Builds application artifact
- Creates AMI in dev account
- Shares AMI with demo account

### Branch Protection
- Pull request required before merging
- Status checks must pass
- Packer validation must pass
- No direct commits to main

## Security Features

- BCrypt password hashing with salt rounds
- Basic Authentication (stateless)
- Input validation and sanitization
- SQL injection prevention (Sequelize ORM)
- System fields protection (account_created, account_updated)
- Ownership-based access control for products
- No git installed in production AMI
- Application runs as non-privileged user (csye6225)
- Database port (3306) not exposed externally

## Production Deployment

1. AMI is built automatically via GitHub Actions
2. Infrastructure deployed via Terraform (see tf-aws-infra repo)
3. Application starts automatically via systemd
4. No manual intervention required

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Application port | 8080 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 3306 |
| DB_NAME | Database name | health_check_db |
| DB_USER | Database user | csye6225 |
| DB_PASS | Database password | - |
| DB_DIALECT | Database dialect | mysql |

## Author

Vatsal Naik - CSYE 6225 Cloud Computing