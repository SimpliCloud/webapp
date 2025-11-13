#!/bin/bash

# Import SSL Certificate to AWS Certificate Manager (ACM)
# This script imports a certificate purchased from Namecheap (or other vendor) into ACM

set -e

echo "====================================="
echo "Import SSL Certificate to ACM"
echo "====================================="

# Configuration
REGION="us-east-1"
PROFILE="demo"
DOMAIN="demo.vatsalnaik.me"

# Certificate files (update paths as needed)
CERTIFICATE_FILE="./demo_vatsalnaik_me.crt"
PRIVATE_KEY_FILE="./demo_vatsalnaik_me.key"
CERTIFICATE_CHAIN_FILE="./demo_vatsalnaik_me_ca_bundle.crt"

# Validate files exist
echo "Checking certificate files..."

if [ ! -f "$CERTIFICATE_FILE" ]; then
    echo "ERROR: Certificate file not found: $CERTIFICATE_FILE"
    echo "Please download your certificate from Namecheap and save it as $CERTIFICATE_FILE"
    exit 1
fi

if [ ! -f "$PRIVATE_KEY_FILE" ]; then
    echo "ERROR: Private key file not found: $PRIVATE_KEY_FILE"
    echo "Please save your private key as $PRIVATE_KEY_FILE"
    exit 1
fi

if [ ! -f "$CERTIFICATE_CHAIN_FILE" ]; then
    echo "ERROR: Certificate chain file not found: $CERTIFICATE_CHAIN_FILE"
    echo "Please download the CA bundle from Namecheap and save it as $CERTIFICATE_CHAIN_FILE"
    exit 1
fi

echo "✓ All certificate files found"
echo ""

# Display certificate information
echo "Certificate Information:"
openssl x509 -in "$CERTIFICATE_FILE" -noout -subject -issuer -dates
echo ""

# Confirm import
read -p "Do you want to import this certificate to ACM? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Import cancelled"
    exit 0
fi

echo ""
echo "Importing certificate to ACM..."

# Import certificate
CERTIFICATE_ARN=$(aws acm import-certificate \
    --certificate fileb://"$CERTIFICATE_FILE" \
    --private-key fileb://"$PRIVATE_KEY_FILE" \
    --certificate-chain fileb://"$CERTIFICATE_CHAIN_FILE" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --tags "Key=Name,Value=$DOMAIN-certificate" "Key=Environment,Value=demo" \
    --query 'CertificateArn' \
    --output text)

echo ""
echo "====================================="
echo "Certificate imported successfully!"
echo "====================================="
echo "Certificate ARN: $CERTIFICATE_ARN"
echo "Domain: $DOMAIN"
echo "Region: $REGION"
echo ""
echo "Next steps:"
echo "1. Update your Terraform configuration to use this certificate"
echo "2. Apply Terraform changes to update the ALB listener"
echo "3. Test HTTPS access: https://$DOMAIN"
echo ""
echo "To view certificate in AWS Console:"
echo "https://console.aws.amazon.com/acm/home?region=$REGION#/certificates"
echo "====================================="

# Save ARN to file for reference
echo "$CERTIFICATE_ARN" > certificate_arn.txt
echo "Certificate ARN saved to certificate_arn.txt"