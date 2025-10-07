# Cloud-Native Web Application TEST

RESTful API with comprehensive integration testing and CI/CD pipeline implementation.

## Prerequisites

- Node.js 18.0 or higher
- MySQL 8.0 or higher
- Git

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Sequelize
- **Authentication**: Basic Auth (Token-based)
- **Password Encryption**: BCrypt
- **Testing**: Jest, SuperTest
- **CI/CD**: GitHub Actions

## Setup Instructions

### 1. Clone Repository

```bash
git clone git@github.com:yourusername/yourrepo.git
cd webapp
```

### 2. Install Dependencies

```bash
cd health-check-api
npm install
```

### 3. Database Setup

Create MySQL database:
```sql
CREATE DATABASE health_check_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Environment Configuration

Create `.env` file from template:
```bash
cp .env.example .env
```

Configure the following variables:
```
NODE_ENV=development
PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_NAME=health_check_db
DB_USER=root
DB_PASS=yourpassword
```

### 5. Run Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run Tests with Coverage
```bash
npm run test:all
```

### Test Coverage
- 42 integration tests covering all endpoints
- Positive test cases (creation, retrieval, update, authentication)
- Negative test cases (invalid input, authentication errors, not found)
- Edge cases (boundary values, special characters, concurrent requests)
- Overall coverage: ~62% statements, ~95% test pass rate

## CI/CD Pipeline

### GitHub Actions Workflow
The repository includes automated CI/CD using GitHub Actions:

- **Trigger**: Pull requests to main branch
- **Environment**: Ubuntu latest with MySQL 8.0 service
- **Pipeline Steps**:
  1. Checkout code
  2. Setup Node.js 18
  3. Install dependencies
  4. Run unit tests
  5. Run integration tests
  6. Upload coverage reports

### Branch Protection
Main branch protection rules enforce:
- Pull request required before merging
- Status checks must pass
- Tests must pass before merge
- No direct commits to main

## API Documentation

### Base URL
```
http://localhost:8080
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
| GET | /v1/user/:userId | Yes | Get user information |
| PUT | /v1/user/:userId | Yes | Update all user fields |
| PATCH | /v1/user/:userId | Yes | Update specific fields |

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

## Project Structure

```
webapp/
├── .github/
│   └── workflows/
│       └── ci.yml
└── health-check-api/
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
    ├── routes/
    │   ├── health.js
    │   ├── users.js
    │   └── products.js
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
    ├── README.md
    └── server.js
```

## Test Categories Implemented

### A. Positive Test Cases
- User and product creation with valid data
- Successful retrieval by ID
- Full and partial updates
- Authentication with valid credentials

### B. Negative Test Cases
- Missing required fields
- Invalid email format
- Duplicate email/SKU
- Invalid credentials
- Non-existent resources
- Wrong HTTP methods

### C. Edge Cases
- Boundary values (min/max strings, 0-100 quantity)
- Special characters handling
- Unicode support
- Concurrent request handling
- Data integrity verification

## Security Features

- BCrypt password hashing with salt
- Basic Authentication (stateless)
- Input validation and sanitization
- SQL injection prevention
- Protected system fields
- Ownership-based access control

## Running Tests in CI

Tests automatically run on every pull request. To view results:
1. Create a pull request
2. Check the "Checks" tab
3. View GitHub Actions workflow status
4. All tests must pass for merge

## Author

Vatsal Naik
