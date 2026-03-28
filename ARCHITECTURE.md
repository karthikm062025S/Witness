# WITNESS - System Architecture

## Project Overview

**WITNESS** is a housing code violation detection system for Virginia tenants. It uses a 3-stage AI pipeline to analyze photos of housing violations, match them to Virginia building codes, and generate formal complaint letters with enforcement contact information.

---

## Directory Structure

```
witness/
├── .kiro/                          # Kiro IDE configuration
│   ├── hooks/                      # Automation hooks
│   │   └── hooks.json
│   ├── settings/                   # IDE settings
│   │   └── mcp.json
│   ├── specs/                      # Feature specifications
│   │   └── witness-backend-api/
│   │       └── requirements.md
│   └── steering/                   # AI guidance files
│       ├── ai-pipeline.md
│       ├── api-reference.md
│       ├── aws-services.md
│       ├── frontend-standards.md
│       ├── project-context.md
│       └── security.md
│
├── data/                           # Reference data
│   ├── housing-codes.json          # 22 Virginia code entries
│   ├── enforcement-contacts.json   # Filing contacts by jurisdiction
│   └── mock-output.json            # Example API response
│
├── demo-photos/                    # Test images
│   ├── Black Mold Apartment Ceiling.jpg
│   ├── broken smoke detector.jpg
│   ├── cockroach infestation.jpg
│   ├── exposed electrical wiring.jpg
│   └── water damaged ceiling.jpg
│
├── infra/                          # Infrastructure as code
│   └── (Step Functions definitions will go here)
│
├── prompts/                        # AI system prompts
│   ├── prompts.md                  # All 3 stage prompts
│   ├── stage1-vision.md
│   ├── stage2-matching.md
│   ├── stage3-complaint.md
│   └── complaint-examples.md
│
├── scripts/                        # Utility scripts
│   └── (DynamoDB seed script will go here)
│
├── src/
│   ├── backend/                    # AWS Lambda functions
│   │   ├── lambdas/
│   │   │   ├── stage1-vision.ts
│   │   │   ├── stage2-matching.ts
│   │   │   ├── stage3-complaint.ts
│   │   │   ├── orchestrator.ts
│   │   │   └── get-upload-url.ts
│   │   └── utils/
│   │       ├── bedrock-client.ts
│   │       └── cors.ts
│   │
│   ├── frontend/                   # React application
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── UploadPage.tsx
│   │       │   ├── ProcessingPage.tsx
│   │       │   └── ResultsPage.tsx
│   │       └── components/
│   │
│   └── shared/                     # Shared TypeScript types
│       └── types.ts
│
└── README.md
```

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Fonts**: DM Serif Display (headings), DM Sans (body)
- **Hosting**: AWS Amplify

### Backend
- **Runtime**: AWS Lambda (Node.js 22, TypeScript)
- **API**: API Gateway HTTP API
- **Orchestration**: AWS Step Functions (Express Workflow)
- **Storage**: Amazon S3 (photo uploads)
- **Database**: Amazon DynamoDB
  - `HousingCodes` table (category + code_section keys)
  - `EnforcementContacts` table (jurisdiction + contact_type keys)

### AI/ML
- **Service**: Amazon Bedrock
- **Model**: Claude 3.5 Haiku (`anthropic.claude-3-5-haiku-20241022-v1:0`)
- **Capabilities**: Vision analysis + text generation

### Region
- **All services**: `us-east-1` (N. Virginia)

---

## System Architecture

### High-Level Flow

```
┌─────────────┐
│   User      │
│  (Mobile/   │
│   Desktop)  │
└──────┬──────┘
       │
       │ 1. Upload photo
       ▼
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Upload Page  │→ │Processing Pg │→ │ Results Page │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────┬────────────────────────────────────────────────┘
         │
         │ 2. POST /get-upload-url
         ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway (HTTP API)                      │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │ /get-upload-url  │      │    /analyze      │        │
│  └────────┬─────────┘      └────────┬─────────┘        │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            │ 3. Generate              │ 5. Trigger pipeline
            │    pre-signed URL        │
            ▼                          ▼
┌──────────────────┐        ┌──────────────────────┐
│  get-upload-url  │        │    orchestrator      │
│     Lambda       │        │       Lambda         │
└────────┬─────────┘        └──────────┬───────────┘
         │                              │
         │ 4. Return URL                │ 6. StartSyncExecution
         │                              ▼
         │                   ┌─────────────────────────┐
         │                   │   Step Functions        │
         │                   │  (Express Workflow)     │
         │                   └──────────┬──────────────┘
         │                              │
         │                              │ Sequential execution
         │                              │
         │                   ┌──────────▼──────────────┐
         │                   │   Stage 1: Vision       │
         │                   │   (stage1-vision.ts)    │
         │                   │                         │
         │                   │ • Get photo from S3     │
         │                   │ • Convert to base64     │
         │                   │ • Call Bedrock vision   │
         │                   │ • Return observations   │
         │                   └──────────┬──────────────┘
         │                              │
         │                   ┌──────────▼──────────────┐
         │                   │   Stage 2: Matching     │
         │                   │  (stage2-matching.ts)   │
         │                   │                         │
         │                   │ • Query DynamoDB codes  │
         │                   │ • Call Bedrock matcher  │
         │                   │ • Verify citations      │
         │                   │ • Return violations     │
         │                   └──────────┬──────────────┘
         │                              │
         │                   ┌──────────▼──────────────┐
         │                   │   Stage 3: Complaint    │
         │                   │ (stage3-complaint.ts)   │
         │                   │                         │
         │                   │ • Query contacts table  │
         │                   │ • Call Bedrock writer   │
         │                   │ • Generate letter       │
         │                   │ • Return full output    │
         │                   └──────────┬──────────────┘
         │                              │
         │                              │ 7. Return results
         │                              ▼
         └──────────────────────────────────────────────┐
                                                         │
                                8. Display results       │
                                                         ▼
                                              ┌──────────────────┐
                                              │  Frontend shows: │
                                              │  • Violations    │
                                              │  • Letter        │
                                              │  • Contacts      │
                                              │  • Evidence log  │
                                              └──────────────────┘
```

---

## Data Flow

### Stage 1 Input
```json
{
  "photoKey": "uploads/1234567890-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```

### Stage 1 Output → Stage 2 Input
```json
{
  "observations": [
    {
      "description": "Dark discoloration and moisture staining visible on ceiling",
      "category": "environmental",
      "confidence": "high"
    }
  ],
  "photoKey": "uploads/1234567890-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```

### Stage 2 Output → Stage 3 Input
```json
{
  "violations": [
    {
      "code_display": "VMC § 305.1",
      "title": "Interior Condition — General",
      "match_reasoning": "Visible ceiling damage consistent with unsanitary conditions",
      "plain_english": "Interior must be kept in good repair and sanitary condition",
      "confidence": "high",
      "severity": "moderate"
    }
  ],
  "photoKey": "uploads/1234567890-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```

### Stage 3 Output (Final)
```json
{
  "violations": [...],
  "letter": "Building Official,\nTown of Blacksburg Code Enforcement\n\n...",
  "summary": "2 potential violations identified including moisture damage",
  "evidenceLog": {
    "timestamp": "2026-03-28T15:30:00.000Z",
    "address": "123 Turner St, Blacksburg, VA",
    "photoKey": "uploads/1234567890-uuid.jpg",
    "jurisdiction": "blacksburg"
  },
  "contacts": [
    {
      "jurisdiction": "blacksburg",
      "contact_type": "code_inspector",
      "office_name": "Town of Blacksburg Code Inspector",
      "phone": "(540) 443-1612",
      "online_form": "https://www.tobweb.org/ayr/"
    }
  ]
}
```

---

## Lambda Functions

### 1. get-upload-url.ts
- **Type**: API Gateway Lambda
- **Purpose**: Generate pre-signed S3 upload URLs
- **Input**: `event.body` (optional)
- **Output**: `{ uploadUrl, photoKey }`
- **CORS**: YES
- **Timeout**: 30 seconds

### 2. orchestrator.ts
- **Type**: API Gateway Lambda
- **Purpose**: Receive API requests and trigger Step Functions
- **Input**: `{ photoKey, address, jurisdiction }`
- **Output**: Stage 3 complete output
- **CORS**: YES
- **Timeout**: 120 seconds

### 3. stage1-vision.ts
- **Type**: Step Functions Lambda
- **Purpose**: Analyze photo using Bedrock vision
- **Input**: Direct object (no event.body)
- **Output**: Observations array
- **CORS**: NO
- **Timeout**: 90 seconds
- **Memory**: 512 MB

### 4. stage2-matching.ts
- **Type**: Step Functions Lambda
- **Purpose**: Match observations to Virginia codes
- **Input**: Stage 1 output
- **Output**: Verified violations array
- **CORS**: NO
- **Timeout**: 90 seconds
- **Key Feature**: Citation verification (anti-hallucination)

### 5. stage3-complaint.ts
- **Type**: Step Functions Lambda
- **Purpose**: Generate complaint letter
- **Input**: Stage 2 output
- **Output**: Complete result with letter and contacts
- **CORS**: NO
- **Timeout**: 90 seconds

---

## DynamoDB Tables

### HousingCodes
```
Partition Key: category (String)
Sort Key: code_section (String)

Example item:
{
  "category": "environmental",
  "code_section": "VMC_305_1",
  "code_display": "VMC § 305.1",
  "title": "Interior Condition — General",
  "requirement_text": "The interior of a structure...",
  "plain_english": "The inside of the apartment...",
  "jurisdiction": "virginia"
}
```

### EnforcementContacts
```
Partition Key: jurisdiction (String)
Sort Key: contact_type (String)

Example item:
{
  "jurisdiction": "blacksburg",
  "contact_type": "code_inspector",
  "office_name": "Town of Blacksburg Code Inspector",
  "department": "Office of Housing and Community Connections",
  "phone": "(540) 443-1612",
  "online_form": "https://www.tobweb.org/ayr/",
  "address": "300 South Main Street, Blacksburg, VA 24060",
  "hours": "Monday-Friday 8:00 AM - 5:00 PM"
}
```

---

## API Endpoints

### POST /get-upload-url
**Request**: `{}`  
**Response**:
```json
{
  "uploadUrl": "https://witness-photos.s3.amazonaws.com/uploads/...",
  "photoKey": "uploads/1234567890-uuid.jpg"
}
```

### POST /analyze
**Request**:
```json
{
  "photoKey": "uploads/1234567890-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```

**Response**: Stage 3 complete output (see Data Flow section)

---

## Key Design Decisions

### 1. Citation Verification (Anti-Hallucination)
Stage 2 verifies every AI-generated code citation against the DynamoDB query results. Any citation not found in the database is filtered out before returning to the user. This prevents the AI from inventing fake code sections.

### 2. Step Functions vs Single Lambda
Using Step Functions provides:
- Visual pipeline monitoring in AWS Console
- Automatic retry logic per stage
- Clear separation of concerns
- Better error isolation

### 3. VMC § vs IPMC § Citation Format
Virginia uses VMC § (Virginia Maintenance Code) for building codes and Va. Code § for state statutes. The system never uses IPMC § to match Virginia's official citation style.

### 4. Pre-signed URLs for Upload
Photos upload directly from client to S3 using pre-signed URLs, avoiding Lambda payload size limits and reducing latency.

### 5. Express Workflow
Step Functions Express Workflow provides synchronous execution, allowing the API to return results immediately without polling.

---

## Environment Variables

### All Lambdas
- `AWS_REGION`: `us-east-1`

### get-upload-url
- `PHOTOS_BUCKET`: S3 bucket name

### stage1-vision
- `PHOTOS_BUCKET`: S3 bucket name
- `MODEL_ID`: Bedrock model identifier

### stage2-matching
- `CODES_TABLE`: `HousingCodes`
- `MODEL_ID`: Bedrock model identifier

### stage3-complaint
- `CONTACTS_TABLE`: `EnforcementContacts`
- `MODEL_ID`: Bedrock model identifier

### orchestrator
- `STATE_MACHINE_ARN`: Step Functions ARN

---

## Security Considerations

### Hackathon Scope
- No authentication required
- CORS set to `*` for demo purposes
- Pre-signed URLs expire after 5 minutes
- File type validation (jpg, png, webp only)
- File size limit (10MB max)
- No PII storage beyond demo data

### Production Considerations (Future)
- Add API key authentication
- Restrict CORS to specific domains
- Add rate limiting
- Implement user accounts
- Add audit logging
- Encrypt sensitive data at rest

---

## Testing Strategy

### Unit Tests
- Bedrock client response parsing
- Citation verification logic
- CORS header generation

### Integration Tests
- S3 upload flow
- DynamoDB queries
- Step Functions execution

### End-to-End Tests
- Upload photo → receive results
- Test with all 5 demo photos
- Verify citation accuracy

---

## Deployment Checklist

1. ✅ Create S3 bucket
2. ✅ Create DynamoDB tables
3. ✅ Seed DynamoDB with housing codes
4. ✅ Enable Bedrock model access
5. ✅ Deploy Lambda functions
6. ✅ Create Step Functions state machine
7. ✅ Create API Gateway
8. ✅ Deploy frontend to Amplify
9. ✅ Test end-to-end flow
10. ✅ Record demo video

---

## Monitoring

### CloudWatch Metrics
- Lambda invocation count
- Lambda error rate
- Lambda duration
- Step Functions execution count
- Step Functions success rate
- API Gateway 4xx/5xx errors

### CloudWatch Logs
- Lambda execution logs
- Step Functions execution history
- API Gateway access logs

---

## Cost Estimate (Hackathon Demo)

- **S3**: ~$0.01 (storage + requests)
- **DynamoDB**: $0 (on-demand, minimal usage)
- **Lambda**: $0 (free tier covers demo)
- **Bedrock**: ~$0.50 (Claude Haiku pricing)
- **Step Functions**: ~$0.01 (Express Workflow)
- **API Gateway**: $0 (free tier)
- **Amplify**: $0 (free tier)

**Total**: < $1 for entire hackathon demo

---

## Future Enhancements

1. Multi-jurisdiction support (expand beyond Virginia)
2. PDF generation for complaint letters
3. Email delivery to enforcement offices
4. Case tracking and follow-up reminders
5. Mobile app (React Native)
6. Multi-language support
7. Accessibility improvements (WCAG 2.1 AA)
8. Tenant rights education content
9. Integration with legal aid organizations
10. Analytics dashboard for advocacy groups
