# AWS Services Configuration

## Region
- us-east-1 (N. Virginia) for all services

## S3
- Bucket: witness-photos-hackathon
- Purpose: store uploaded housing-condition photos
- Access:
  - pre-signed URLs for client upload
  - Lambda IAM role for read access
- Notes:
  - uploaded files should go under `uploads/`
  - use short-lived pre-signed URLs
  - allow image uploads only for demo flow

## DynamoDB
### Table 1 — HousingCodes
- Partition key: `category` (String)
- Sort key: `code_section` (String)
- Capacity mode: on-demand
- Purpose: store housing code rules used in Stage 2 matching

### Table 2 — EnforcementContacts
- Partition key: `jurisdiction` (String)
- Sort key: `contact_type` (String)
- Capacity mode: on-demand
- Purpose: store filing contacts and escalation paths

## Bedrock
- Model: Claude Haiku 4.5 (`anthropic.claude-haiku-4-5-20251001-v1:0`)
- Region: `us-east-1`
- Must have model access enabled in the Bedrock console
- Stage usage:
  - Stage 1: vision analysis
  - Stage 2: code matching
  - Stage 3: complaint generation

## Lambda
- Runtime: Node.js 22.x
- Language: TypeScript
- Memory: 512 MB
- Timeout: 90 seconds
- Architecture: arm64

### Required Lambda functions
1. `get-upload-url`
   - returns pre-signed S3 upload URL
2. `stage1-vision`
   - analyzes uploaded image
3. `stage2-matching`
   - matches observations to code entries
4. `stage3-complaint`
   - generates complaint letter and filing info
5. `orchestrator`
   - receives API request and runs Step Functions

## Step Functions
- Type: Express Workflow
- Flow:
  1. `stage1-vision`
  2. `stage2-matching`
  3. `stage3-complaint`
- Each stage output becomes the next stage input

## API Gateway
- Type: HTTP API
- Routes:
  - `POST /get-upload-url` → `get-upload-url`
  - `POST /analyze` → `orchestrator`
  - `OPTIONS /*` → CORS
- CORS:
  - Allow-Origin: `*`
  - Allow-Headers: `Content-Type`
  - Allow-Methods: `POST, OPTIONS`

## Amplify
- Purpose: host the React frontend
- Connect to GitHub main branch
- Build command: `npm run build`
- Output directory: `dist/`

## Reliability Priorities
- End-to-end demo quality is more important than extra features
- The pipeline must work cleanly on obvious test photos
- If orchestration becomes unstable, preserve a single working flow first