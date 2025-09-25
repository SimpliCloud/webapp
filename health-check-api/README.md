# Cloud-Native Web Application - Assignment 2

RESTful API implementation with user management and product CRUD operations using Node.js, Express, and MySQL.

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
- **Testing**: Jest

## Setup Instructions

### 1. Clone Repository

```bash
git clone git@github.com:yourusername/yourrepo.git
cd health-check-api
```

### 2. Install Dependencies

```bash
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

The application will automatically create database tables on first run.

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

### Request/Response Examples

#### Create User
```bash
curl -X POST http://localhost:8080/v1/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

Response (201):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "account_created": "2025-01-01T00:00:00.000Z",
  "account_updated": "2025-01-01T00:00:00.000Z"
}
```

#### Create Product
```bash
curl -X POST http://localhost:8080/v1/product \
  -H "Authorization: Basic base64string" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "sku": "LAP-001",
    "manufacturer": "TechCorp",
    "quantity": 10
  }'
```

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

Run test suite:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Project Structure

```
.
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
│   └── products.test.js
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── README.md
└── server.js
```

## Security Features

- BCrypt password hashing with salt
- Basic Authentication (token-based, stateless)
- Input validation and sanitization
- SQL injection prevention via Sequelize ORM
- Protected system fields (account_created, account_updated)
- Ownership-based access control

## Author

Vatsal Naik

## License

MIT