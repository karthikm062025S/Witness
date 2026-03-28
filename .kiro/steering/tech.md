# Tech Stack

## Frontend
- React 18 + Vite
- TypeScript
- Tailwind CSS (utility classes only — no custom CSS files, no styled-components)
- Mobile-first, tested at 375px minimum width

## Backend
- AWS Lambda (Node.js 20.x, TypeScript, arm64, 512MB, 90s timeout)
- AWS API Gateway HTTP API (not REST API)
- AWS Step Functions Express Workflow (synchronous, chains the 3 stage Lambdas)
- Amazon Bedrock — model: `anthropic.claude-3-5-haiku-20241022-v1:0`
- Amazon DynamoDB (on-demand capacity)
  - Table `HousingCodes`: partition key `category`, sort key `code_section`
  - Table `EnforcementContacts`: partition key `jurisdiction`, sort key `contact_type`
- Amazon S3 (photo uploads via pre-signed PUT URLs, 5-min expiry)
- Region: us-east-1

## Shared
- Shared TypeScript types in `src/shared/types.ts`
- ES modules throughout (`"type": "module"`) — no `require()`
- esbuild for Lambda bundling

## Key AWS SDK Packages (backend)
```json
"@aws-sdk/client-bedrock-runtime": "latest",
"@aws-sdk/client-dynamodb": "latest",
"@aws-sdk/lib-dynamodb": "latest",
"@aws-sdk/client-s3": "latest",
"@aws-sdk/s3-request-presigner": "latest",
"@aws-sdk/client-sfn": "latest"
```

## Critical SDK Rules
- Use `@aws-sdk/client-bedrock-runtime` NOT `@aws-sdk/client-bedrock`
- Use `DynamoDBDocumentClient` from `@aws-sdk/lib-dynamodb` (v3), NOT `DocumentClient` (v2)
- Always include `anthropic_version: "bedrock-2023-05-31"` in Bedrock request body
- Parse Bedrock response with: `JSON.parse(new TextDecoder().decode(response.body)).content[0].text`
- Do NOT include `data:image/jpeg;base64,` prefix in base64 strings sent to Bedrock

## Environment Variables (set in Lambda console, never hardcoded)
- `PHOTOS_BUCKET` — S3 bucket name
- `CODES_TABLE` — "HousingCodes"
- `CONTACTS_TABLE` — "EnforcementContacts"
- `STATE_MACHINE_ARN` — Step Functions ARN

## Common Commands
```bash
# Frontend dev server
cd src/frontend && npm run dev

# Frontend build
cd src/frontend && npm run build

# Install backend deps
cd src/backend && npm install

# Type check (backend)
cd src/backend && npx tsc --noEmit

# Seed DynamoDB
cd src/backend && npx tsx scripts/seed-dynamodb.ts

# Serve frontend locally (for screenshots)
node serve.mjs
```
