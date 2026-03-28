# WITNESS AWS Integration Guide - Complete Setup

## 🎯 What You're Building

**WITNESS** is an AI-powered housing code violation detection system with a **3-stage AI pipeline**:

1. **Stage 1 (Vision)**: AI analyzes photo → identifies visible problems
2. **Stage 2 (Matching)**: AI matches problems → Virginia housing codes
3. **Stage 3 (Complaint)**: AI generates → formal complaint letter

**AI Model**: Amazon Bedrock Claude 3.5 Haiku (with vision capability)

---

## 📋 Prerequisites

### 1. AWS Account
- Active AWS account with billing enabled
- Access to AWS Console
- Region: **us-east-1** (N. Virginia) - REQUIRED for Bedrock model

### 2. AWS CLI (Optional but Recommended)
```bash
# Install AWS CLI
# Windows: Download from https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: apt-get install awscli

# Configure with your credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

### 3. Local Development
- Node.js 22.x installed
- npm installed
- Git installed

---

## 🔑 AWS Credentials & API Keys

### What You Need:

**NO API KEYS NEEDED!** AWS uses IAM roles for Lambda functions.

### What You DO Need:

1. **AWS Account ID** (12-digit number)
   - Find it: AWS Console → Top right → Account dropdown
   - Example: `123456789012`

2. **AWS Access Keys** (for deployment only)
   - AWS Console → IAM → Users → Your user → Security credentials
   - Create access key → Download CSV
   - **Keep these secret!** Never commit to Git

3. **Bedrock Model Access** (enable in console)
   - AWS Console → Bedrock → Model access
   - Request access to: `Claude 3.5 Haiku`
   - Takes 5-10 minutes to approve

---

## 🤖 AI Model Information

### Model Details:
- **Name**: Claude Haiku 4.5
- **Model ID**: `anthropic.claude-haiku-4-5-20251001-v1:0`
- **Provider**: Anthropic (via Amazon Bedrock)
- **Released**: October 15, 2025
- **Capabilities**: 
  - Text generation
  - **Vision** (can analyze images)
  - JSON output
  - 200K context window (2x larger than 3.5 Haiku)
  - Near-frontier performance
  - Best-in-class coding
- **Cost**: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens
- **Region**: us-east-1 only

### Why This Model?
- **Near-frontier performance** - Almost as good as Claude Opus
- **Best coding model** - Excellent for technical tasks
- **Vision capability** (can see photos)
- **Affordable** for hackathon (~$0.50 per 100 photos)
- **Fast** - Optimized for real-time applications
- **Reliable JSON output**

---

## 🏗️ AWS Services Architecture

```
User uploads photo
    ↓
API Gateway (POST /get-upload-url)
    ↓
Lambda: get-upload-url → S3 pre-signed URL
    ↓
User uploads to S3
    ↓
API Gateway (POST /analyze)
    ↓
Lambda: orchestrator → Step Functions
    ↓
┌─────────────────────────────────────┐
│  Step Functions (3-stage pipeline)  │
│                                      │
│  Stage 1: Lambda (stage1-vision)    │
│    ↓ Bedrock Claude 3.5 Haiku       │
│    ↓ Analyzes photo                 │
│    ↓ Returns observations           │
│                                      │
│  Stage 2: Lambda (stage2-matching)  │
│    ↓ Queries DynamoDB (codes)       │
│    ↓ Bedrock matches codes          │
│    ↓ Verifies citations             │
│    ↓ Returns violations             │
│                                      │
│  Stage 3: Lambda (stage3-complaint) │
│    ↓ Queries DynamoDB (contacts)    │
│    ↓ Bedrock generates letter       │
│    ↓ Returns full result            │
└─────────────────────────────────────┘
    ↓
Returns to user: observations, violations, letter, contacts
    ↓
User clicks "Send Complaint"
    ↓
API Gateway (POST /send-complaint)
    ↓
Lambda: send-complaint → Returns mailto link + contacts
```

---

## 📦 Step-by-Step AWS Setup

### STEP 1: Create S3 Bucket

**Purpose**: Store uploaded photos

```bash
# Via AWS CLI
aws s3 mb s3://witness-photos-hackathon --region us-east-1

# Via Console:
# 1. Go to S3 → Create bucket
# 2. Name: witness-photos-hackathon
# 3. Region: us-east-1
# 4. Block all public access: ON (keep checked)
# 5. Create bucket
```

**What code uses this**:
- `get-upload-url.ts` - generates upload URLs
- `stage1-vision.ts` - retrieves photos for analysis

---

### STEP 2: Create DynamoDB Tables

**Purpose**: Store housing codes and enforcement contacts

#### Table 1: HousingCodes

```bash
# Via AWS CLI
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

**Via Console**:
1. DynamoDB → Create table
2. Table name: `HousingCodes`
3. Partition key: `category` (String)
4. Sort key: `code_section` (String)
5. Table settings: Default
6. Billing mode: On-demand
7. Create table

#### Table 2: EnforcementContacts

```bash
# Via AWS CLI
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

**Via Console**:
1. DynamoDB → Create table
2. Table name: `EnforcementContacts`
3. Partition key: `jurisdiction` (String)
4. Sort key: `contact_type` (String)
5. Billing mode: On-demand
6. Create table

**What code uses this**:
- `stage2-matching.ts` - queries housing codes
- `stage3-complaint.ts` - queries enforcement contacts

---

### STEP 3: Seed DynamoDB Tables

**Purpose**: Load 22 housing codes + 6 contacts into database

```bash
# From workspace root (C:\Witness)
cd src/backend
npx tsx scripts/seed-dynamodb.ts
```

**Expected output**:
```
🌱 Starting DynamoDB seed process...
Region: us-east-1
HousingCodes table: HousingCodes
EnforcementContacts table: EnforcementContacts

📋 Seeding HousingCodes table...
Found 22 housing code entries
✓ Wrote 22 items to HousingCodes (22/22)
✅ HousingCodes seeding complete: 22 success, 0 errors

📞 Seeding EnforcementContacts table...
Found 6 enforcement contact entries
✓ Wrote 6 items to EnforcementContacts (6/6)
✅ EnforcementContacts seeding complete: 6 success, 0 errors

==================================================
📊 Seed Summary:
  HousingCodes: 22 items
  EnforcementContacts: 6 items
  Total: 28 items
==================================================
✅ Seed process complete!
```

**Troubleshooting**:
- If error: "Cannot find module" → Run `npm install` first
- If error: "AccessDenied" → Check AWS credentials
- If error: "ResourceNotFound" → Create tables first (Step 2)

---

### STEP 4: Enable Bedrock Model Access

**Purpose**: Get permission to use Claude Haiku 4.5

1. AWS Console → Search "Bedrock"
2. Left sidebar → Model access
3. Click "Manage model access" (orange button)
4. Find "Claude Haiku 4.5" in list
5. Check the box next to it
6. Click "Submit use case details" (Anthropic requires this for first-time customers)
7. Fill in use case form:
   - **Title**: Housing Code Violation Detection System
   - **Description**: AI-powered system to help tenants document housing violations using vision analysis
   - **Volume**: 100-500 requests during hackathon
8. Submit and wait 5-10 minutes for approval
9. Refresh page → Status should be "Access granted" ✅

**Model ID**: `anthropic.claude-haiku-4-5-20251001-v1:0`

**What code uses this**:
- `bedrock-client.ts` - calls Bedrock API
- All 3 stage Lambdas use this

**Cost estimate**: ~$0.50 per 100 photos analyzed (very cheap for demo)

---

### STEP 5: Create IAM Role for Lambda

**Purpose**: Give Lambda functions permission to access AWS services

#### Via Console:

1. IAM → Roles → Create role
2. Trusted entity: AWS service
3. Use case: Lambda
4. Click Next
5. Attach policies:
   - Search and attach: `AWSLambdaBasicExecutionRole`
6. Click Next
7. Role name: `WitnessLambdaRole`
8. Create role

#### Add Inline Policy:

1. Find your new role: IAM → Roles → WitnessLambdaRole
2. Permissions tab → Add permissions → Create inline policy
3. Click JSON tab
4. Paste this:

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
        "dynamodb:Query",
        "dynamodb:GetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/HousingCodes",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/EnforcementContacts"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "states:StartSyncExecution"
      ],
      "Resource": "arn:aws:states:us-east-1:ACCOUNT_ID:stateMachine:WitnessStateMachine"
    }
  ]
}
```

5. **IMPORTANT**: Replace `ACCOUNT_ID` with your 12-digit AWS account number (2 places)
6. Policy name: `WitnessLambdaPolicy`
7. Create policy

**What this allows**:
- S3: Read/write photos
- DynamoDB: Query codes and contacts
- Bedrock: Call AI model
- Step Functions: Start workflow

---

### STEP 6: Build Lambda Deployment Packages

**Purpose**: Bundle code into ZIP files for AWS

```bash
# From workspace root (C:\Witness)
chmod +x scripts/build.sh
./scripts/build.sh
```

**Expected output**:
```
=== WITNESS Backend Build ===
  [ok] bundled get-upload-url
  [ok] bundled orchestrator
  [ok] bundled stage1-vision
  [ok] bundled stage2-matching
  [ok] bundled stage3-complaint
  [ok] bundled send-complaint
  [ok] zipped get-upload-url
  [ok] zipped orchestrator
  [ok] zipped stage1-vision
  [ok] zipped stage2-matching
  [ok] zipped stage3-complaint
  [ok] zipped send-complaint
=== Build complete: dist/zips/*.zip ===
```

**Output location**: `dist/zips/` folder with 6 ZIP files

**Windows users**: If build.sh doesn't work, use Git Bash or WSL

---

### STEP 7: Create Lambda Functions (6 total)

**For EACH Lambda below**, follow these steps:

1. Lambda → Create function
2. Function name: (see table below)
3. Runtime: Node.js 22.x
4. Architecture: arm64
5. Execution role: Use existing role → WitnessLambdaRole
6. Create function
7. Code tab → Upload from → .zip file
8. Upload the corresponding ZIP from `dist/zips/`
9. Configuration tab → General configuration → Edit
   - Memory: 512 MB
   - Timeout: (see table below)
   - Save
10. Configuration tab → Environment variables → Edit
    - Add variables (see table below)
    - Save

#### Lambda Configuration Table:

| Function Name | ZIP File | Handler | Timeout | Environment Variables |
|---------------|----------|---------|---------|----------------------|
| get-upload-url | get-upload-url.zip | get-upload-url.handler | 30s | `PHOTOS_BUCKET=witness-photos-hackathon` |
| orchestrator | orchestrator.zip | orchestrator.handler | 90s | `STATE_MACHINE_ARN=<from Step 8>` |
| stage1-vision | stage1-vision.zip | stage1-vision.handler | 90s | `PHOTOS_BUCKET=witness-photos-hackathon` |
| stage2-matching | stage2-matching.zip | stage2-matching.handler | 90s | `CODES_TABLE=HousingCodes` |
| stage3-complaint | stage3-complaint.zip | stage3-complaint.handler | 90s | `CONTACTS_TABLE=EnforcementContacts` |
| send-complaint | send-complaint.zip | send-complaint.handler | 30s | (none) |

**Note**: For `orchestrator`, you'll add `STATE_MACHINE_ARN` after Step 8.

---

### STEP 8: Create Step Functions State Machine

**Purpose**: Orchestrate the 3-stage AI pipeline

1. Step Functions → Create state machine
2. Choose authoring method: Write your workflow in code
3. Type: Express
4. Definition: Paste content from `infra/step-functions-definition.json`
5. **IMPORTANT**: Replace `ACCOUNT_ID` with your AWS account number (3 places in the JSON)
6. Name: `WitnessStateMachine`
7. Permissions: Create new role
8. Create state machine
9. **Copy the ARN** (looks like: `arn:aws:states:us-east-1:123456789012:stateMachine:WitnessStateMachine`)
10. Go back to Lambda → orchestrator → Configuration → Environment variables
11. Add: `STATE_MACHINE_ARN=<paste ARN here>`

**What this does**:
- Runs Stage 1 → Stage 2 → Stage 3 in sequence
- Passes output from each stage to the next
- Handles retries and errors

---

### STEP 9: Create API Gateway

**Purpose**: Expose Lambda functions as HTTP endpoints

1. API Gateway → Create API
2. Choose: HTTP API
3. Click Build
4. API name: `WitnessAPI`
5. Click Next
6. Configure routes:

#### Route 1: POST /get-upload-url
- Method: POST
- Resource path: `/get-upload-url`
- Integration: Lambda
- Lambda function: get-upload-url
- Click Create

#### Route 2: POST /analyze
- Method: POST
- Resource path: `/analyze`
- Integration: Lambda
- Lambda function: orchestrator
- Click Create

#### Route 3: POST /send-complaint
- Method: POST
- Resource path: `/send-complaint`
- Integration: Lambda
- Lambda function: send-complaint
- Click Create

7. Configure CORS:
   - CORS → Configure
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type`
   - Access-Control-Allow-Methods: `POST, OPTIONS`
   - Save

8. Deploy:
   - Stages → $default → Deploy
   - **Copy the Invoke URL** (looks like: `https://abc123.execute-api.us-east-1.amazonaws.com`)

**Your API is now live!**

---

## 🧪 Testing Your Deployment

### Test 1: Get Upload URL

```bash
curl -X POST https://YOUR-API-URL/get-upload-url \
  -H "Content-Type: application/json"
```

**Expected response**:
```json
{
  "uploadUrl": "https://witness-photos-hackathon.s3.amazonaws.com/...",
  "photoKey": "uploads/1234567890-abc-def.jpg"
}
```

### Test 2: Upload Photo

Use the demo photos in `demo-photos/` folder:

```bash
# Get upload URL first
RESPONSE=$(curl -X POST https://YOUR-API-URL/get-upload-url)
UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')
PHOTO_KEY=$(echo $RESPONSE | jq -r '.photoKey')

# Upload photo
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @"demo-photos/Black Mold Apartment Ceiling.jpg"
```

### Test 3: Analyze Photo

```bash
curl -X POST https://YOUR-API-URL/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "photoKey": "YOUR-PHOTO-KEY-FROM-STEP-2",
    "address": "123 Turner St, Blacksburg, VA",
    "jurisdiction": "blacksburg"
  }'
```

**Expected response** (takes 15-20 seconds):
```json
{
  "observations": [
    {
      "description": "dark discoloration on ceiling surface",
      "category": "environmental",
      "confidence": "high"
    }
  ],
  "violations": [
    {
      "code_section": "VMC_305_1",
      "code_display": "VMC § 305.1",
      "title": "Interior surfaces",
      "match_reasoning": "...",
      "plain_english": "...",
      "confidence": "high",
      "severity": "moderate",
      "observation_ref": "dark discoloration on ceiling surface"
    }
  ],
  "complaint_letter": "To Whom It May Concern:\n\n...",
  "evidence_log": {
    "timestamp": "2026-03-28T...",
    "location": "123 Turner St, Blacksburg, VA",
    "photo_reference": "uploads/..."
  },
  "contacts": [...]
}
```

### Test 4: Send Complaint

```bash
curl -X POST https://YOUR-API-URL/send-complaint \
  -H "Content-Type: application/json" \
  -d '{
    "letter": "Your complaint letter text here",
    "jurisdiction": "blacksburg"
  }'
```

**Expected response**:
```json
{
  "mailto_link": "mailto:codeenforcement@blacksburg.gov?subject=...",
  "phone_numbers": ["(540) 443-1612", "(540) 443-1300"],
  "online_form": "https://www.tobweb.org/ayr/",
  "address": "300 South Main Street, Blacksburg, VA 24060",
  "contacts": [...]
}
```

---

## 💰 Cost Estimate

**For hackathon demo (100 photos)**:
- S3: $0.01
- DynamoDB: $0.00 (free tier)
- Lambda: $0.00 (free tier)
- Bedrock: $0.50
- Step Functions: $0.10
- API Gateway: $0.00 (free tier)

**Total**: ~$0.61 for 100 photos

---

## 🔒 Security Notes

### What's Secure:
- ✅ No hardcoded credentials
- ✅ IAM roles for Lambda
- ✅ S3 bucket is private
- ✅ Pre-signed URLs expire in 5 minutes
- ✅ No PII logged to CloudWatch

### What's NOT Secure (Hackathon Only):
- ⚠️ CORS allows all origins (`*`)
- ⚠️ No authentication on API
- ⚠️ No rate limiting

**For production**: Add API keys, authentication, and rate limiting.

---

## 📝 Summary Checklist

- [ ] AWS account created
- [ ] AWS CLI configured (optional)
- [ ] S3 bucket created
- [ ] DynamoDB tables created
- [ ] DynamoDB tables seeded (28 items)
- [ ] Bedrock model access enabled
- [ ] IAM role created with permissions
- [ ] Lambda functions built (6 ZIPs)
- [ ] Lambda functions deployed (6 functions)
- [ ] Step Functions state machine created
- [ ] API Gateway created (3 routes)
- [ ] Tested all endpoints
- [ ] API URL saved for frontend

---

## 🎉 You're Done!

Your backend is now live on AWS with a fully functional AI pipeline!

**Next steps**:
1. Give your API URL to frontend teammate
2. Test with all 5 demo photos
3. Build the frontend UI
4. Demo at hackathon!

**API URL to share**: `https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com`

**Endpoints**:
- POST /get-upload-url
- POST /analyze
- POST /send-complaint
