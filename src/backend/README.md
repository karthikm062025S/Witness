# WITNESS Backend API

Complete serverless backend implementation for the WITNESS housing code violation detection system.

## Architecture

3-stage AI pipeline orchestrated by AWS Step Functions:

1. **Stage 1 (Vision)**: Bedrock analyzes photo → returns observations
2. **Stage 2 (Matching)**: Queries DynamoDB → matches codes → **verifies citations** (anti-hallucination)
3. **Stage 3 (Complaint)**: Generates formal complaint letter with enforcement contacts

## Project Structure

```
src/backend/
├── lambdas/
│   ├── get-upload-url.ts      # API Gateway: Generate S3 pre-signed URLs
│   ├── orchestrator.ts         # API Gateway: Trigger Step Functions
│   ├── stage1-vision.ts        # Step Functions: Photo analysis
│   ├── stage2-matching.ts      # Step Functions: Code matching
│   └── stage3-complaint.ts     # Step Functions: Letter generation
├── utils/
│   ├── bedrock-client.ts       # Bedrock API wrapper
│   └── cors.ts                 # CORS headers helper
├── package.json
├── tsconfig.json
└── README.md

src/shared/
└── types.ts                    # TypeScript interfaces

infra/
└── step-functions-definition.json  # State machine definition

scripts/
└── seed-dynamodb.ts            # Database seeding script

data/
├── housing-codes.json          # 22 Virginia code entries
└── enforcement-contacts.json   # Filing contacts
```

## Environment Variables

### All Lambdas
- `AWS_REGION`: us-east-1

### get-upload-url
- `PHOTOS_BUCKET`: S3 bucket name for photos

### stage1-vision
- `PHOTOS_BUCKET`: S3 bucket name for photos

### stage2-matching
- `CODES_TABLE`: HousingCodes table name

### stage3-complaint
- `CONTACTS_TABLE`: EnforcementContacts table name

### orchestrator
- `STATE_MACHINE_ARN`: Step Functions ARN

## Installation

```bash
cd src/backend
npm install
```

## Build

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Database Seeding

Before running the system, seed DynamoDB tables:

```bash
# Set environment variables
export HOUSING_CODES_TABLE_NAME=HousingCodes
export ENFORCEMENT_CONTACTS_TABLE_NAME=EnforcementContacts

# Run seed script
cd scripts
npx tsx seed-dynamodb.ts
```

This loads:
- 22 Virginia housing code entries → HousingCodes table
- 6 enforcement contacts → EnforcementContacts table

## API Endpoints

### POST /get-upload-url

Generate pre-signed S3 URL for photo upload.

**Request**:
```json
{}
```

**Response**:
```json
{
  "uploadUrl": "https://...",
  "photoKey": "uploads/1234567890-uuid.jpg"
}
```

### POST /analyze

Analyze uploaded photo and generate complaint.

**Request**:
```json
{
  "photoKey": "uploads/1234567890-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```

**Response**:
```json
{
  "observations": [...],
  "violations": [...],
  "complaint_letter": "...",
  "evidence_log": {...},
  "contacts": [...]
}
```

## Key Design Decisions

### Anti-Hallucination (Stage 2)
Every AI-generated code citation is verified against DynamoDB query results. Citations not found in the database are filtered out. This prevents the system from citing non-existent code sections.

### Lambda Types
- **API Gateway Lambdas** (get-upload-url, orchestrator): Parse `event.body`, return CORS headers
- **Step Functions Lambdas** (stage1-vision, stage2-matching, stage3-complaint): Direct input, no CORS headers

### Model Configuration
- Model: `anthropic.claude-3-5-haiku-20241022-v1:0` (hardcoded in bedrock-client.ts)
- Max tokens: 4096
- Region: us-east-1

### Pre-signed URLs
- Expiration: 5 minutes (300 seconds)
- Direct client-to-S3 upload (bypasses Lambda payload limits)

### Citation Format
- Virginia Maintenance Code: `VMC § 305.1`
- Virginia State Code: `Va. Code § 55.1-1220(A)(5)`
- Never uses IPMC format

## Deployment Notes

### Step Functions State Machine
Replace `ACCOUNT` placeholder in `infra/step-functions-definition.json` with your AWS account ID before deploying.

### IAM Permissions

**get-upload-url**:
- `s3:PutObject` on photos bucket

**stage1-vision**:
- `s3:GetObject` on photos bucket
- `bedrock:InvokeModel`

**stage2-matching**:
- `dynamodb:Query` on HousingCodes table
- `bedrock:InvokeModel`

**stage3-complaint**:
- `dynamodb:Query` on EnforcementContacts table
- `bedrock:InvokeModel`

**orchestrator**:
- `states:StartSyncExecution` on state machine

## Testing

The implementation includes comprehensive logging for debugging:

- Lambda invocation start/end
- External service calls with timing
- Citation verification results
- Error details with context

Check CloudWatch Logs for each Lambda function.

## Tech Stack

- **Runtime**: Node.js 22.x
- **Language**: TypeScript 6.0
- **AWS Services**: Lambda, S3, DynamoDB, Bedrock, Step Functions, API Gateway
- **AI Model**: Claude 3.5 Haiku with vision

## Security

- No hardcoded AWS credentials
- All resource names from environment variables
- CORS: Allow-Origin `*` (hackathon scope)
- Pre-signed URLs expire after 5 minutes
- File type validation: jpeg, png, webp
- Max file size: 10MB

## Disclaimer

All generated complaint letters include:

> "This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance."

## Support

For issues or questions, refer to:
- `ARCHITECTURE.md` - System overview
- `DOCUMENTATION-INDEX.md` - Complete documentation index
- `.kiro/specs/witness-backend-api/` - Full specification documents
