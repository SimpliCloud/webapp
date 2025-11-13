# CSYE 6225 - Cloud-Native Web Application

Cloud-native RESTful web application with user management, product management, image uploads, and email verification.

## Technology Stack

- **Runtime:** Node.js 20.x
- **Framework:** Express.js
- **Database:** MySQL 8.0 (Amazon RDS)
- **ORM:** Sequelize
- **Storage:** Amazon S3
- **Authentication:** Basic Authentication (BCrypt)
- **Monitoring:** CloudWatch Logs & Metrics, StatsD
- **Email:** Amazon SES via Lambda

## Prerequisites

### Local Development

- Node.js 20.x or higher
- MySQL 8.0
- AWS CLI configured
- Git

### AWS Resources (Deployed)

- VPC with public/private subnets
- Application Load Balancer
- Auto Scaling Group (3-5 instances)
- RDS MySQL instance
- S3 bucket
- SNS topic
- Lambda function
- DynamoDB table

## Installation

### 1. Clone Repository

```bash
git clone git@github.com:YOUR-ORG/webapp.git
cd webapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env` file:

```env
NODE_ENV=development
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=csye6225
DB_USER=root
DB_PASS=your-password

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
SNS_TOPIC_ARN=arn:aws:sns:...

# Logging
LOG_LEVEL=info
BCRYPT_SALT_ROUNDS=10

# Email Verification
VERIFICATION_TOKEN_EXPIRY=60
VERIFICATION_BASE_URL=http://localhost:8080
```

### 4. Setup Database

```bash
# Create database
mysql -u root -p
CREATE DATABASE csye6225;
exit;

# Tables created automatically by Sequelize
```

### 5. Run Application

```bash
npm start
```

Application runs on: `http://localhost:8080`

## API Endpoints

### User Management

- `POST /v1/user` - Create user account
- `GET /v1/user/:userId` - Get user (authenticated)
- `PUT /v1/user/:userId` - Update user (authenticated)
- `PATCH /v1/user/:userId` - Partial update user (authenticated)
- `GET /v1/user/verify?email=...&token=...` - Verify email address

### Product Management

- `POST /v1/product` - Create product (authenticated)
- `GET /v1/product/:productId` - Get product
- `PUT /v1/product/:productId` - Update product (authenticated, owner only)
- `PATCH /v1/product/:productId` - Partial update product (authenticated, owner only)
- `DELETE /v1/product/:productId` - Delete product (authenticated, owner only)

### Image Management

- `POST /v1/product/:productId/image` - Upload image (authenticated)
- `GET /v1/product/:productId/image` - List images
- `GET /v1/product/:productId/image/:imageId` - Get image details
- `DELETE /v1/product/:productId/image/:imageId` - Delete image (authenticated)

### Health Check

- `GET /healthz` - Health check endpoint

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

## Deployment

### AMI Build (Packer)

AMI is built automatically via GitHub Actions on merge to main branch.

**Manual build:**

```bash
cd packer
packer init .
packer build -var "subnet_id=subnet-xxx" aws-ubuntu.pkr.hcl
```

### Infrastructure Deployment

See [tf-aws-infra](https://github.com/Vatsal-Naik-CSYE-6225/tf-aws-infra) repository for Terraform deployment.

## Email Verification Flow

1. User creates account via `POST /v1/user`
2. User record created with `email_verified: false`
3. SNS message published with verification token
4. Lambda function triggered, sends email via SES
5. User receives email with verification link (expires in 60 seconds)
6. User clicks link: `GET /v1/user/verify?email=...&token=...`
7. If valid and not expired, `email_verified` set to `true`

## Security Features

- Passwords hashed with BCrypt (10 salt rounds)
- Basic Authentication for protected endpoints
- HTTPS/TLS encryption in production
- KMS encryption for data at rest
- Secrets Manager for credentials
- IMDSv2 for EC2 metadata

## Monitoring

- **Logs:** CloudWatch Logs group `csye6225`
- **Metrics:** CloudWatch namespace `CSYE6225`
- **Custom Metrics:** API calls, response times, DB queries, S3 operations, SNS publishes

## CI/CD

- **Pull Request:** Runs tests, validates Packer template
- **Merge to Main:** Builds AMI, shares with DEMO account, deploys to DEMO

## Authors

- Vatsal Naik

## License

MIT