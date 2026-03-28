# WITNESS Backend Deployment Guide

Complete guide for deploying the WITNESS backend API to AWS.

## Prerequisites

- AWS Account with Bedrock access enabled
- AWS CLI configured with appropriate credentials
- Node.js 22+ installed
- AWS SAM CLI or CDK (optional, for infrastructure as code)

## Step 1: Create AWS Resources

### 1.1 Create S3 Bucket

```bash
aws s3 mb s3://witness-photos-hackathon --region us-east-1
```

### 1.2 Create DynamoDB Tables

**HousingCodes Table**:
```bash
aws dynamodb create-table \
  --table-name HousingCodes \
  --attribute-definitions \
    AttributeName=category,AttributeType=S \
    AttributeName=code_section,AttributeType=S \
  --key-schema \
    AttributeName=category,KeyType=HASH \
    AttributeName=code_section,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**EnforcementContacts Table**:
```bash
aws dynamodb create-table \
  --table-name EnforcementContacts \
  --attribute-definitions \
    AttributeName=jurisdiction,AttributeType=S \
    AttributeName=contact_type,AttributeType=S \
  --key-schema \
    AttributeName=jurisdiction,KeyType=HASH \
    AttributeName=contact_type,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 1.3 Seed DynamoDB Tables

```bash
cd scripts
export HOUSING_CODES_TABLE_NAME=HousingCodes
export ENFORCEMENT_CONTACTS_TABLE_NAME=EnforcementContacts
npx tsx seed-dynamodb.ts
```

Expected output:
- 22 housing code entries
- 6 enforcement contact entries

## Step 2: Build Lambda Functions

```bash
cd src/backend
npm install
npm run build
```

This creates compiled JavaScript in `dist/` directory.

## Step 3: Package Lambda Functions

For each Lambda, create a deployment package:

```bash
# Example for stage1-vision
cd dist/lambdas
zip -r stage1-vision.zip stage1-vision.js ../utils/ ../../shared/
```

Repeat for all 5 Lambda functions:
- get-upload-url
- orchestrator
- stage1-vision
- stage2-matching
- stage3-complaint

## Step 4: Create Lambda Functions

### 4.1 Create IAM Execution Role

Create a role with these policies:
- AWSLambdaBasicExecutionRole (CloudWatch Logs)
- Custom policy for S3, DynamoDB, Bedrock, Step Functions

**Example custom policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::witness-photos-hackathon/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/HousingCodes",
        "arn:aws:dynamodb:us-east-1:*:table/EnforcementContacts"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "states:StartSyncExecution"
      ],
      "Resource": "arn:aws:states:us-east-1:*:stateMachine:WitnessStateMachine"
    }
  ]
}
```

### 4.2 Deploy Lambda Functions

**get-upload-url**:
```bash
aws lambda create-function \
  --function-name get-upload-url \
  --runtime nodejs22.x \
  --role arn:aws:iam::ACCOUNT:role/WitnessLambdaRole \
  --handler lambdas/get-upload-url.handler \
  --zip-file fileb://get-upload-url.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{PHOTOS_BUCKET=witness-photos-hackathon}" \
  --region us-east-1
```

**orchestrator**:
```bash
aws lambda create-function \
  --function-name orchestrator \
  --runtime nodejs22.x \
  --role arn:aws:iam::ACCOUNT:role/WitnessLambdaRole \
  --handler lambdas/orchestrator.handler \
  --zip-file fileb://orchestrator.zip \
  --timeout 90 \
  --memory-size 512 \
  --environment Variables="{STATE_MACHINE_ARN=arn:aws:states:us-east-1:ACCOUNT:stateMachine:WitnessStateMachine}" \
  --region us-east-1
```

**stage1-vision**:
```bash
aws lambda create-function \
  --function-name stage1-vision \
  --runtime nodejs22.x \
  --role arn:aws:iam::ACCOUNT:role/WitnessLambdaRole \
  --handler lambdas/stage1-vision.handler \
  --zip-file fileb://stage1-vision.zip \
  --timeout 90 \
  --memory-size 512 \
  --environment Variables="{PHOTOS_BUCKET=witness-photos-hackathon}" \
  --region us-east-1
```

**stage2-matching**:
```bash
aws lambda create-function \
  --function-name stage2-matching \
  --runtime nodejs22.x \
  --role arn:aws:iam::ACCOUNT:role/WitnessLambdaRole \
  --handler lambdas/stage2-matching.handler \
  --zip-file fileb://stage2-matching.zip \
  --timeout 90 \
  --memory-size 512 \
  --environment Variables="{CODES_TABLE=HousingCodes}" \
  --region us-east-1
```

**stage3-complaint**:
```bash
aws lambda create-function \
  --function-name stage3-complaint \
  --runtime nodejs22.x \
  --role arn:aws:iam::ACCOUNT:role/WitnessLambdaRole \
  --handler lambdas/stage3-complaint.handler \
  --zip-file fileb://stage3-complaint.zip \
  --timeout 90 \
  --memory-size 512 \
  --environment Variables="{CONTACTS_TABLE=EnforcementContacts}" \
  --region us-east-1
```

## Step 5: Create Step Functions State Machine

### 5.1 Update State Machine Definition

Edit `infra/step-functions-definition.json` and replace `ACCOUNT` with your AWS account ID.

### 5.2 Create State Machine

```bash
aws stepfunctions create-state-machine \
  --name WitnessStateMachine \
  --type EXPRESS \
  --definition file://infra/step-functions-definition.json \
  --role-arn arn:aws:iam::ACCOUNT:role/WitnessStepFunctionsRole \
  --region us-east-1
```

## Step 6: Create API Gateway

### 6.1 Create HTTP API

```bash
aws apigatewayv2 create-api \
  --name WitnessAPI \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="Content-Type" \
  --region us-east-1
```

### 6.2 Create Lambda Integrations

**get-upload-url integration**:
```bash
aws apigatewayv2 create-integration \
  --api-id API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:ACCOUNT:function:get-upload-url \
  --payload-format-version 2.0 \
  --region us-east-1
```

**orchestrator integration**:
```bash
aws apigatewayv2 create-integration \
  --api-id API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:ACCOUNT:function:orchestrator \
  --payload-format-version 2.0 \
  --region us-east-1
```

### 6.3 Create Routes

```bash
# POST /get-upload-url
aws apigatewayv2 create-route \
  --api-id API_ID \
  --route-key "POST /get-upload-url" \
  --target integrations/INTEGRATION_ID \
  --region us-east-1

# POST /analyze
aws apigatewayv2 create-route \
  --api-id API_ID \
  --route-key "POST /analyze" \
  --target integrations/INTEGRATION_ID \
  --region us-east-1
```

### 6.4 Create Stage

```bash
aws apigatewayv2 create-stage \
  --api-id API_ID \
  --stage-name prod \
  --auto-deploy \
  --region us-east-1
```

### 6.5 Grant API Gateway Permission to Invoke Lambdas

```bash
aws lambda add-permission \
  --function-name get-upload-url \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:ACCOUNT:API_ID/*/*" \
  --region us-east-1

aws lambda add-permission \
  --function-name orchestrator \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:ACCOUNT:API_ID/*/*" \
  --region us-east-1
```

## Step 7: Enable Bedrock Model Access

1. Go to AWS Bedrock console
2. Navigate to "Model access"
3. Request access to: `Claude 3.5 Haiku`
4. Wait for approval (usually instant)

## Step 8: Test Deployment

### 8.1 Test Upload URL Generation

```bash
curl -X POST https://API_ID.execute-api.us-east-1.amazonaws.com/prod/get-upload-url
```

Expected response:
```json
{
  "uploadUrl": "https://...",
  "photoKey": "uploads/..."
}
```

### 8.2 Upload Test Photo

```bash
curl -X PUT "UPLOAD_URL" \
  --upload-file demo-photos/Black\ Mold\ Apartment\ Ceiling.jpg \
  --header "Content-Type: image/jpeg"
```

### 8.3 Test Analysis

```bash
curl -X POST https://API_ID.execute-api.us-east-1.amazonaws.com/prod/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "photoKey": "uploads/...",
    "address": "123 Turner St, Blacksburg, VA",
    "jurisdiction": "blacksburg"
  }'
```

Expected response:
```json
{
  "observations": [...],
  "violations": [...],
  "complaint_letter": "...",
  "evidence_log": {...},
  "contacts": [...]
}
```

## Step 9: Frontend Integration

Update frontend environment variables:

```env
VITE_API_BASE_URL=https://API_ID.execute-api.us-east-1.amazonaws.com/prod
```

## Troubleshooting

### Lambda Timeout
- Increase timeout to 90 seconds for all Lambdas
- Check CloudWatch Logs for execution duration

### Bedrock Access Denied
- Verify model access is enabled in Bedrock console
- Check IAM role has `bedrock:InvokeModel` permission

### DynamoDB Query Errors
- Verify table names match environment variables
- Check IAM role has `dynamodb:Query` permission

### Step Functions Execution Failed
- Check CloudWatch Logs for each Lambda
- Verify Lambda ARNs in state machine definition
- Check IAM role for Step Functions

### CORS Errors
- Verify API Gateway CORS configuration
- Check Lambda responses include CORS headers

## Monitoring

### CloudWatch Logs
- `/aws/lambda/get-upload-url`
- `/aws/lambda/orchestrator`
- `/aws/lambda/stage1-vision`
- `/aws/lambda/stage2-matching`
- `/aws/lambda/stage3-complaint`

### CloudWatch Metrics
- Lambda invocations
- Lambda errors
- Lambda duration
- Step Functions executions
- API Gateway requests

## Cost Optimization

- Use on-demand billing for DynamoDB (low traffic)
- Set Lambda memory to 512 MB (balance cost/performance)
- Use Express Workflow for Step Functions (synchronous, cheaper)
- Pre-signed URLs reduce Lambda data transfer costs

## Security Hardening (Production)

1. Replace CORS `*` with specific frontend domain
2. Add API Gateway authentication (Cognito, API keys)
3. Enable CloudTrail for audit logging
4. Add WAF rules for API Gateway
5. Encrypt S3 bucket with KMS
6. Enable DynamoDB point-in-time recovery
7. Add rate limiting to API Gateway

## Cleanup

To remove all resources:

```bash
# Delete API Gateway
aws apigatewayv2 delete-api --api-id API_ID

# Delete Step Functions
aws stepfunctions delete-state-machine --state-machine-arn ARN

# Delete Lambda functions
aws lambda delete-function --function-name get-upload-url
aws lambda delete-function --function-name orchestrator
aws lambda delete-function --function-name stage1-vision
aws lambda delete-function --function-name stage2-matching
aws lambda delete-function --function-name stage3-complaint

# Delete DynamoDB tables
aws dynamodb delete-table --table-name HousingCodes
aws dynamodb delete-table --table-name EnforcementContacts

# Delete S3 bucket (must be empty)
aws s3 rb s3://witness-photos-hackathon --force
```

---

**Deployment Status**: ✅ Ready for deployment
**Estimated Time**: 30-45 minutes
**Difficulty**: Intermediate
