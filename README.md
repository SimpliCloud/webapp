# SimpliCloud – Serverless E-Commerce Platform (Application Layer)

SimpliCloud is a cloud-native, security-focused, and scalable e-commerce backend designed to demonstrate how easily modern applications can be built and deployed using AWS-managed services and Infrastructure as Code.  
This repository contains the **application layer**—including user management, product handling, media workflows, authentication, analytics, and observability.

---

## 🚀 Features & Capabilities

### 🔐 Authentication & User Security
- **JWT-based authentication** with access + refresh tokens  
- **Multi-Factor Authentication (MFA)** via SMS/TOTP  
- **Email verification**, secure email-change workflow  
- **Password reset** with time-limited signed tokens  
- **IAM-based scoped permissions**  
- **Password hashing with BCrypt (10 rounds)**  
- Encrypted data at rest (AWS KMS) and TLS for all production traffic  

---

### 🛒 Product & Media Management
- CRUD operations for products with ownership validation  
- S3-backed image upload, listing, retrieval, and deletion  
- **Lambda-based serverless image processing** (auto-resize/compression)  
- **CloudFront CDN** for low-latency media delivery  
- Versioned uploads, lifecycle configuration, MIME validation  

---

### 🔎 Search, Performance & Reliability
- **OpenSearch** full-text + faceted search  
- **Redis caching** (ElastiCache) for product listings & sessions  
- **API Gateway rate limiting + WAF rules** for DDoS mitigation  
- **Per-user throttling policies**  
- MySQL query optimization through indexing and schema design  

---

### 📊 Observability & Analytics
- **AWS X-Ray** for distributed tracing  
- **CloudWatch dashboards & alarms** for app-level metrics  
- **Real-time analytics pipeline** using **Amazon Kinesis**  
- Request correlation IDs for end-to-end debugging  
- Structured application logs with Winston → CloudWatch Logs  

---

## 🛠️ Technology Stack

| Layer                | Technologies |
|---------------------|--------------|
| Runtime             | Node.js 20.x |
| Framework           | Express.js   |
| Database            | MySQL 8.0 (Amazon RDS) |
| Storage             | Amazon S3, CloudFront CDN |
| Search              | Amazon OpenSearch |
| Caching             | Redis (ElastiCache) |
| Auth                | JWT, MFA, SES Email Verification |
| Monitoring          | CloudWatch, X-Ray, Kinesis |
| CI/CD               | GitHub Actions + Packer |

---

## 📦 Local Development

### Prerequisites
- Node.js 20+  
- MySQL 8.0  
- AWS CLI configured  
- Git  

---

## 🧰 Installation & Setup

### 1. Clone Repository
```
git clone https://github.com/YOUR-USER/webapp.git
cd webapp
```
### 2. Install Dependencies
```
npm install
```

### 3. Configure Environment
Create .env file
```
NODE_ENV=development
PORT=8080

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your-password
DB_NAME=simplicloud

AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
OPENSEARCH_ENDPOINT=https://your-opensearch-endpoint

JWT_SECRET=your-jwt-secret
MFA_ISSUER=SimpliCloud
VERIFICATION_BASE_URL=http://localhost:8080
```
### 4. Setup Database
```
mysql -u root -p
CREATE DATABASE simplicloud;
exit;
```
Sequelize will automatically create required tables.

### 5. Start Application
```
npm start
```
App available at: http://localhost:8080

### API Endpoints
Users
```
POST   /v1/user
GET    /v1/user/:id
PUT    /v1/user/:id
PATCH  /v1/user/:id
GET    /v1/user/verify
POST   /v1/user/mfa/verify
POST   /v1/user/password/reset
```
Products
```
POST   /v1/product
GET    /v1/product/:id
PUT    /v1/product/:id
PATCH  /v1/product/:id
DELETE /v1/product/:id
```
Product Images
```
POST   /v1/product/:id/image
GET    /v1/product/:id/image
DELETE /v1/product/:id/image/:imageId
```
Health
```
GET /healthz
```

### 🧪 Testing
```
npm test
npm run test:unit
npm run test:integration
```

### 🚀 Deployment Workflow

This app is tightly integrated with the tf-aws-infra repository:

GitHub Actions builds an AMI using Packer

AMI is published to AWS

Terraform Auto Scaling Groups pull the AMI

Rolling updates or blue-green deploys occur automatically

Infrastructure Repo:
```
https://github.com/YOUR-USER/tf-aws-infra
```
### 🔍 Observability Pipeline

Tracing: AWS X-Ray

Metrics: CloudWatch (custom namespace: SimpliCloud)

Streaming Analytics: Kinesis

Logs: CloudWatch Logs groups with structured JSON

Anomaly Detection: CloudWatch AI-based detectors

### 👤 Author

Vatsal Naik

### 📄 License

MIT
