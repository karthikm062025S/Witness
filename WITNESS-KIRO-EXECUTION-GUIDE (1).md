# WITNESS — KIRO EXECUTION GUIDE
### IT'S 10 AM. HERE'S EVERYTHING. GO.

---

## 1. VMC § vs Va. Code § vs IPMC § — THE DIFFERENCE

**Short answer: They're all correct. They're different legal systems that overlap.**

| Citation Style | What It Is | Example | When To Use |
|---|---|---|---|
| **IPMC §305.3** | International Property Maintenance Code (the model code published by ICC) | IPMC §305.3 = Interior Surfaces | This is what Virginia ADOPTED. Use these numbers in your database and complaint letters. |
| **VMC §305.3** / **VPMC §305.3** | Virginia Maintenance Code / Virginia Property Maintenance Code — Virginia's name for their version of the IPMC | Same section, Virginia's label | VMC is just Virginia's wrapper around the IPMC. Same section numbers. Virginia uses a "dual numbering system" — the IPMC numbers ARE the VMC numbers. |
| **Va. Code §55.1-1220** | Code of Virginia (state statutes/laws passed by the Virginia General Assembly) | §55.1-1220 = Landlord obligations | These are SEPARATE from the IPMC/VMC. These are Virginia state LAWS about landlord-tenant relationships. |

**The key insight:** Virginia's building codes (VMC/VPMC) use the exact same section numbers as the IPMC because they literally incorporated IPMC Chapters 2-8 by reference. So `IPMC §305.3` = `VMC §305.3` = `VPMC §305.3`. They're the same rule.

But `Va. Code §55.1-1220` is a completely different body of law — it's the Virginia Residential Landlord and Tenant Act (VRLTA), passed by the state legislature. It covers landlord obligations that go BEYOND building codes (like mold remediation, smoke alarm certificates, security deposits).

**For our app:** We cite BOTH in complaint letters. The IPMC/VMC codes say "your ceiling must be maintained in sanitary condition." The Va. Code says "your landlord must prevent mold growth." Together they're more powerful than either alone.

**In the database, our entries already handle this correctly:**
- Building code violations → `IPMC §305.3`, `IPMC §604.3`, etc.
- State law violations → `VA Code §55.1-1220(5)`, `VA Code §55.1-1231`, etc.
- The complaint letter cites both when applicable

**No changes needed to the battle plan.** The IPMC numbers we're using ARE the Virginia-enforced numbers.

---

## 2. GITHUB REPOS YOU SHARED — VERDICT

### Repo 1: `kirodotdev/powers` (Official Kiro Powers)
**USEFUL? YES — but selectively.**

What's in it: Official Kiro Powers maintained by Kiro/AWS team. Each Power is a bundle of steering files + MCP configs + hooks.

**What to install:**
- **`aws-infrastructure-as-code`** — Helps Kiro write better CDK/CloudFormation. Has MCP server `awslabs.aws-iac-mcp-server`. Could help with DynamoDB/Lambda/Step Functions setup.
- **`aws-sam`** — Helps Kiro write better serverless Lambda code. Has MCP server for serverless patterns.
- **`cloud-architect`** — General AWS architecture guidance with Well-Architected patterns.

**How to install (Person A does this at 10:05):**
1. In Kiro → Powers panel (you can see it in your screenshot)
2. Click "Add Custom Power"
3. Select "Import from URL"
4. Paste: `https://github.com/kirodotdev/powers/tree/main/aws-infrastructure-as-code`
5. Click Install
6. Repeat for `aws-sam` and `cloud-architect` if time allows

**Skip everything else** — Figma, Stripe, Neon, Datadog, Dynatrace, etc. are irrelevant.

### Repo 2: `praveenc/kiro-powers` (Community Powers)
**USEFUL? MAYBE — low priority.**

- **`cloudscape-design-frontend`** — AWS Cloudscape UI components. We're using Tailwind, not Cloudscape. Skip.
- **`mcp-maker`** — For building MCP servers. We're not building MCP servers. Skip.
- **`raycast-extension-builder`** — macOS only, irrelevant. Skip.

**Verdict: Skip this repo entirely.**

### Repo 3: `iamaanahmad/everything-kiro-ide` (Community Config Collection)
**USEFUL? YES — for reference patterns, but don't copy blindly.**

What's valuable:
- The `.kiro/steering/` examples for coding standards and security rules
- The agent patterns (architect, code-reviewer, test-engineer)
- The hook configurations (file watchers, git integration)

**How to use:** Don't install it as a Power. Instead, use it as INSPIRATION for our own steering files (which I'm giving you below, already customized for Witness).

---

## 3. COMPLETE KIRO SETUP — EVERY FILE

### Directory Structure (create this NOW)

```
witness/
├── .kiro/
│   ├── steering/
│   │   ├── project-context.md
│   │   ├── ai-pipeline.md
│   │   ├── api-reference.md       ← MOST IMPORTANT FILE
│   │   ├── aws-services.md
│   │   ├── frontend-standards.md
│   │   └── security.md
│   ├── hooks/
│   │   └── hooks.json
│   └── settings/
│       └── mcp.json
├── src/
│   ├── backend/
│   │   └── lambdas/
│   └── frontend/
│       └── src/
├── data/
│   ├── housing-codes.json
│   └── enforcement-contacts.json
├── prompts/
│   ├── stage1-vision.md
│   ├── stage2-matching.md
│   └── stage3-complaint.md
├── demo-photos/
├── .gitignore
├── package.json
└── README.md
```

---

### FILE: `.kiro/steering/project-context.md`

```markdown
# Witness — Housing Code Violation Detector

## What this project does
A mobile-first web app where tenants photograph housing violations
and AI identifies the building code being violated, then generates
a formal complaint letter with filing instructions.

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: AWS Lambda (Node.js 20, TypeScript) + API Gateway HTTP API
- AI: Amazon Bedrock (Claude Haiku 4.5 with vision capability)
- Database: Amazon DynamoDB (two tables: HousingCodes, EnforcementContacts)
- Storage: Amazon S3 (photo uploads with pre-signed URLs)
- Orchestration: AWS Step Functions (Express Workflow)
- Hosting: AWS Amplify
- Region: us-east-1

## Coding Standards
- Use TypeScript for ALL files (frontend and backend)
- Use functional React components with hooks only
- Use Tailwind utility classes — NO custom CSS files, NO styled-components
- All API calls use async/await with try/catch error handling
- All AI responses include confidence levels
- Mobile-first responsive design (test at 375px width minimum)
- ESLint + Prettier for formatting
- No console.log in production code — use structured error objects

## Project Structure
- Backend Lambdas: src/backend/lambdas/
- Frontend pages: src/frontend/src/pages/
- Frontend components: src/frontend/src/components/
- Shared types: src/shared/types.ts
- System prompts: prompts/
- Seed data: data/

## API Contract
Two endpoints only:
- POST /get-upload-url → returns { uploadUrl, photoKey }
- POST /analyze → accepts { photoKey, address, jurisdiction } → returns full analysis results
```

---

### FILE: `.kiro/steering/ai-pipeline.md`

```markdown
# AI Pipeline Architecture

## Overview
Three-stage AI pipeline orchestrated by AWS Step Functions.
Each stage is a separate Lambda function.
Data flows: Stage 1 output → Stage 2 input → Stage 3 input.

## Stage 1: Visual Analysis (stage1-vision)
- Lambda: src/backend/lambdas/stage1-vision.ts
- Uses Bedrock Claude Haiku 4.5 WITH VISION
- Input: base64-encoded photo from S3
- Output: JSON with observations array
- Each observation has: description, category, confidence
- Categories: structural, electrical, plumbing, environmental, fire_safety, pest
- Confidence: high, medium, low
- CRITICAL: Must be observations only — NEVER diagnoses or legal conclusions

## Stage 2: Code Matching (stage2-matching)
- Lambda: src/backend/lambdas/stage2-matching.ts
- Queries DynamoDB table 'HousingCodes' by violation category (partition key)
- Sends observations + retrieved codes to Bedrock
- Output: violations array with code citations and plain English
- CRITICAL: After AI response, VERIFY every cited code_display exists in DynamoDB results
- Filter out any hallucinated citations before returning

## Stage 3: Complaint Generation (stage3-complaint)
- Lambda: src/backend/lambdas/stage3-complaint.ts
- Receives violations from Stage 2 + address + jurisdiction
- Queries DynamoDB table 'EnforcementContacts' by jurisdiction
- Uses few-shot prompting with example complaint letters
- Output: formal complaint letter, evidence log, enforcement contacts
- Letter ends with legal disclaimer

## Data Flow Between Stages
Stage 1 returns → { observations: [...] }
Stage 2 receives observations, returns → { violations: [...] }
Stage 3 receives violations + metadata, returns → { letter, evidenceLog, contacts }

## Step Functions passes output of each stage as input to the next automatically.
```

---

### FILE: `.kiro/steering/api-reference.md` ← MOST IMPORTANT

```markdown
# Exact API References — No Assumptions
# Kiro MUST follow these exact patterns. Do NOT deviate.

## Bedrock Model ID (EXACT — do not change)
anthropic.claude-3-5-haiku-20241022-v1:0

NOTE: If the above model ID does not work or is not available, check
the Bedrock console for the exact model ID. The model must support
image input for Stage 1.

## Bedrock SDK Imports (EXACT)
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
// Do NOT use @aws-sdk/client-bedrock — that's for model management, not inference
```

## Bedrock Request Format (EXACT)
```typescript
const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

const response = await bedrock.send(new InvokeModelCommand({
  modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",  // REQUIRED — Bedrock rejects without this
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        // For vision (Stage 1 ONLY):
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: photoBase64String  // NO data:image/jpeg;base64, prefix
          }
        },
        // For text prompt:
        {
          type: "text",
          text: "your prompt here"
        }
      ]
    }]
  })
}));
```

## Bedrock Response Parsing (EXACT)
```typescript
const result = JSON.parse(new TextDecoder().decode(response.body));
const textContent = result.content[0].text;
// textContent is a string — parse as JSON if model was instructed to output JSON
const parsed = JSON.parse(textContent);
```

## DynamoDB SDK Imports (EXACT)
```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
// Do NOT use DocumentClient (v2) — use DynamoDBDocumentClient (v3)

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));
```

## DynamoDB Query Pattern (EXACT)
```typescript
const result = await dynamodb.send(new QueryCommand({
  TableName: process.env.CODES_TABLE,  // "HousingCodes"
  KeyConditionExpression: "category = :cat",
  ExpressionAttributeValues: { ":cat": categoryValue }
}));
const items = result.Items || [];
```

## S3 Pre-signed URL Pattern (EXACT)
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-east-1" });
const key = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;

const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: process.env.PHOTOS_BUCKET,
  Key: key,
  ContentType: "image/jpeg"
}), { expiresIn: 300 });
```

## S3 Get Object as Base64 (EXACT)
```typescript
const obj = await s3.send(new GetObjectCommand({
  Bucket: process.env.PHOTOS_BUCKET,
  Key: photoKey
}));
const chunks: Uint8Array[] = [];
for await (const chunk of obj.Body as any) {
  chunks.push(chunk);
}
const buffer = Buffer.concat(chunks);
const base64 = buffer.toString("base64");
```

## Step Functions SDK (EXACT)
```typescript
import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "us-east-1" });
const execution = await sfn.send(new StartSyncExecutionCommand({
  stateMachineArn: process.env.STATE_MACHINE_ARN,
  input: JSON.stringify({ photoKey, address, jurisdiction })
}));
const output = JSON.parse(execution.output || "{}");
```

## Lambda Handler Signature (EXACT)
```typescript
// For API Gateway HTTP API events:
export const handler = async (event: any) => {
  const body = JSON.parse(event.body || "{}");
  // ... process ...
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(result)
  };
};

// For Step Functions direct invocation (NO event.body parsing):
export const handler = async (event: any) => {
  // event IS the input object directly
  const { photoKey, observations, violations, address, jurisdiction } = event;
  // ... process ...
  return result; // Return object directly, no statusCode wrapper
};
```

## Environment Variables (set in Lambda console, NOT in code)
- PHOTOS_BUCKET: S3 bucket name for photos
- CODES_TABLE: "HousingCodes"
- CONTACTS_TABLE: "EnforcementContacts"
- STATE_MACHINE_ARN: Step Functions ARN (set after creating state machine)

## NPM Packages Needed (backend)
```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "latest",
    "@aws-sdk/client-dynamodb": "latest",
    "@aws-sdk/lib-dynamodb": "latest",
    "@aws-sdk/client-s3": "latest",
    "@aws-sdk/s3-request-presigner": "latest",
    "@aws-sdk/client-sfn": "latest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/aws-lambda": "latest",
    "esbuild": "latest"
  }
}
```

## CRITICAL: Common Kiro Mistakes to Prevent
1. Do NOT use `@aws-sdk/client-bedrock` — use `@aws-sdk/client-bedrock-runtime`
2. Do NOT use `InvokeModel` — use `InvokeModelCommand`
3. Do NOT forget `anthropic_version: "bedrock-2023-05-31"` in the body
4. Do NOT parse `event.body` for Step Functions Lambdas — they receive raw input
5. Do NOT use `DocumentClient` (v2) — use `DynamoDBDocumentClient` (v3)
6. Do NOT set region in the model ID — region goes in the client constructor
7. Do NOT use `"claude-3-haiku"` — the FULL model ID is `"anthropic.claude-3-5-haiku-20241022-v1:0"`
8. Do NOT include `data:image/jpeg;base64,` prefix in base64 strings sent to Bedrock
9. Do NOT forget CORS headers on API Gateway responses
10. Do NOT use `require()` — use ES module `import` syntax
```

---

### FILE: `.kiro/steering/aws-services.md`

```markdown
# AWS Services Configuration

## Region: us-east-1 (N. Virginia) — ALL services in this region

## S3
- Bucket: witness-photos-hackathon (or whatever was created)
- Purpose: Store uploaded photos
- Access: Pre-signed URLs for upload, Lambda IAM role for read
- CORS: Allow POST from * origin

## DynamoDB
- Table 1: HousingCodes
  - Partition key: category (String) — e.g., "environmental", "structural"
  - Sort key: code_section (String) — e.g., "IPMC_305_3"
  - Capacity: On-demand (pay-per-request)
- Table 2: EnforcementContacts
  - Partition key: jurisdiction (String) — e.g., "blacksburg"
  - Sort key: contact_type (String) — e.g., "code_inspector"
  - Capacity: On-demand

## Bedrock
- Model: anthropic.claude-3-5-haiku-20241022-v1:0 (supports text + image)
- Region: us-east-1
- Must have model access enabled in Bedrock console

## Lambda
- Runtime: Node.js 20.x
- Memory: 512 MB (needed for image processing)
- Timeout: 90 seconds (AI calls take 5-15 seconds each)
- Architecture: arm64 (cheaper, faster)
- 5 Lambda functions total:
  1. get-upload-url — generates pre-signed S3 URL
  2. stage1-vision — photo analysis
  3. stage2-matching — code matching
  4. stage3-complaint — complaint generation
  5. orchestrator — receives API request, triggers Step Functions

## Step Functions
- Type: Express Workflow (synchronous, cheaper)
- Chains: stage1-vision → stage2-matching → stage3-complaint
- Each stage output becomes next stage input automatically

## API Gateway
- Type: HTTP API (not REST API — HTTP is simpler and cheaper)
- Routes:
  - POST /get-upload-url → get-upload-url Lambda
  - POST /analyze → orchestrator Lambda
  - OPTIONS /* → auto CORS
- CORS: Allow-Origin *, Allow-Headers Content-Type

## Amplify
- Purpose: Host the React frontend
- Connect to GitHub repo main branch
- Build settings: npm run build, output dist/
- Deploy at ~4-5 PM when frontend is working
```

---

### FILE: `.kiro/steering/frontend-standards.md`

```markdown
# Frontend Standards & Page Specifications

## Design System
- Framework: React 18 + Vite
- Styling: Tailwind CSS utility classes ONLY
- Font: Load from Google Fonts — pick a distinctive pair, NOT Inter/Roboto
  - Heading: DM Serif Display or Playfair Display or Fraunces
  - Body: DM Sans or Source Sans 3 or Outfit
- Colors (CSS variables):
  - --color-primary: dark navy (#1a1a2e) or forest green (#2d4739)
  - --color-accent: amber (#f59e0b) or coral (#ef4444) or teal (#14b8a6)
  - --color-bg: off-white (#f8fafc)
  - --color-text: dark gray (#1e293b)
  - --color-danger: red (#dc2626) for high-severity violations
  - --color-warning: yellow (#eab308) for medium severity
  - --color-success: green (#16a34a) for low severity
- Mobile-first: design for 375px, scale up
- Generous whitespace — more padding than default
- Card animations: fade-in with stagger (0.1s delay between cards)

## Screen 1: Upload Page
- App name "WITNESS" with tagline "Know your rights. Document violations. Take action."
- Camera capture button (large, centered, thumb-friendly)
  - Uses: <input type="file" accept="image/*" capture="environment">
- Drag-and-drop upload zone (desktop fallback)
- Photo preview thumbnail after selection
- Address text input (placeholder: "123 Turner St, Blacksburg, VA")
- Jurisdiction dropdown: "Blacksburg, VA" (default), "Montgomery County, VA"
- Analyze button (disabled until photo selected, spinner when loading)
- Footer disclaimer: "Documentation assistance only. Not legal advice."

## Screen 2: Processing Page
- Photo preview at top
- Header: "Analyzing your documentation..."
- 4 stage indicators with state transitions:
  - ○ → ⏳ → ✅ "Inspecting photo..."
  - ○ → ⏳ → ✅ "Matching building codes..."
  - ○ → ⏳ → ✅ "Generating complaint letter..."
  - ○ → ⏳ → ✅ "Finding enforcement contacts..."
- Progress bar
- "Estimated time: ~15-20 seconds"
- Cancel button

## Screen 3: Results Dashboard

### Section A — Summary Card
- "X Potential Violations Found"
- Overall confidence indicator
- Property address + date

### Section B — Violation Cards (one per violation)
- Severity color dot (red=high, yellow=medium, gray=low)
- Code citation badge (e.g., "IPMC §305.3")
- Title: "Interior Surfaces"
- What was observed (from photo)
- Your rights (plain English)
- Confidence bar (visual, color-coded)
- Expandable: full official code text
- Expandable: relevant Virginia law if applicable

### Section C — Complaint Letter
- "Your Complaint Letter" header
- Full letter text (scrollable)
- "Copy to Clipboard" button
- "Download as PDF" button

### Section D — How to File
- "Ready to file? Here's how:" header
- Step 1: "Copy and paste into the online form"
  - → tobweb.org/ayr/ (Town of Blacksburg)
  - [Copy Complaint to Clipboard] button
- Step 2: "Print and deliver in person"
  - → 300 South Main St, Blacksburg, VA 24060
  - [Download as PDF] button
- Step 3: "Call and read over the phone"
  - → Code Inspector: (540) 443-1612
  - → Planning & Building: (540) 443-1300
  - → Hours: Mon-Fri 8:00 AM - 5:00 PM
- For areas outside Blacksburg:
  - → Montgomery County: (540) 382-6120 ext. 160
- If local enforcement is unresponsive, escalate to:
  - → Virginia DHCD: (804) 371-7150
  - → dhcd.virginia.gov

### Section E — Evidence Log
- Date and time of documentation
- GPS coordinates (if available from EXIF)
- Photo reference
- "This evidence log was generated at [timestamp]"

### Section F — Footer
- Disclaimer: "This tool provides documentation assistance only. It does not constitute legal advice. Consult a qualified attorney for legal guidance."
- "Analyze Another Photo" button

## Component Guidelines
- All interactive elements must have aria-labels
- Loading states for all async operations
- Error states with user-friendly messages (not stack traces)
- Image file type validation (jpg, png, webp only, max 10MB)
- No console.log in production
```

---

### FILE: `.kiro/steering/security.md`

```markdown
# Security Standards (Hackathon Scope)

## Must Do
1. NEVER hardcode AWS credentials in source code
2. Use Lambda IAM roles for all AWS service access
3. Use environment variables for bucket names, table names, ARNs
4. Add "Not legal advice" disclaimer on EVERY page and generated document
5. Validate file type on upload (only image/jpeg, image/png, image/webp)
6. Validate file size on upload (max 10MB)
7. Sanitize user input (address field) before passing to AI prompts
8. Set CORS to allow-origin: * for hackathon (restrict in production)
9. Pre-signed URLs expire after 5 minutes
10. No PII storage — demo uses test photos only

## Do NOT
- Do NOT store real tenant personal information
- Do NOT add authentication (not needed for demo)
- Do NOT add rate limiting (not needed for demo)
- Do NOT use eval() or dynamic code execution
- Do NOT log user photos to CloudWatch
```

---

### FILE: `.kiro/hooks/hooks.json`

```json
[
  {
    "name": "Auto-commit on save",
    "eventType": "fileEdited",
    "filePatterns": ["src/**/*.ts", "src/**/*.tsx"],
    "hookAction": "runCommand",
    "command": "cd /workspace && git add -A && git commit -m 'auto: save progress' --no-verify 2>/dev/null || true"
  },
  {
    "name": "TypeScript type check",
    "eventType": "fileEdited",
    "filePatterns": ["src/**/*.ts", "src/**/*.tsx"],
    "hookAction": "runCommand",
    "command": "npx tsc --noEmit --pretty 2>&1 | head -20"
  }
]
```

---

### FILE: `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "fetch": {
      "command": "node",
      "args": ["/path/to/fetch-server"],
      "disabled": false
    }
  }
}
```

**NOTE:** Kiro ships with fetch built-in. Just go to Kiro panel → MCP Servers → click the pencil icon → change `"disabled": true` to `"disabled": false`. That's it.

---

### FILE: `.gitignore`

```
node_modules/
dist/
.env
.env.local
*.js.map
.DS_Store
*.log
coverage/
.vscode/
# Do NOT gitignore .kiro/ — judges want to see it!
```

---

## 4. THREE-PERSON DELEGATION — STARTING NOW (10:00 AM)

### PERSON A (Backend / Infra) — START IMMEDIATELY

**10:00-10:10 — Setup (do this in parallel with reading)**
1. Open project in Kiro
2. Create the `.kiro/steering/` directory
3. Create ALL 6 steering files (copy from above — project-context.md, ai-pipeline.md, api-reference.md, aws-services.md, frontend-standards.md, security.md)
4. Create `.kiro/hooks/hooks.json`
5. Enable fetch MCP (Kiro panel → MCP → pencil → disabled: false)
6. Click "Generate Steering Docs" button in Kiro to auto-supplement
7. OPTIONAL: Install `aws-infrastructure-as-code` Power from `https://github.com/kirodotdev/powers/tree/main/aws-infrastructure-as-code`

**10:10-10:15 — Verify AWS is ready**
- Confirm Bedrock model access is enabled (Claude Haiku)
- Confirm S3 bucket exists
- Confirm DynamoDB tables exist (HousingCodes + EnforcementContacts)

**10:15 — Spec 1: Stage 1 Vision Lambda**
Tell Kiro (Spec mode → + Create New Spec):
```
Create a new Spec. Build an AWS Lambda function at src/backend/lambdas/stage1-vision.ts.

Follow the EXACT patterns in the api-reference.md steering file for all AWS SDK usage. Do NOT deviate from the imports, model IDs, or response parsing patterns specified there.

This Lambda:
1. Receives input directly from Step Functions: { photoKey, address, jurisdiction }
   — Do NOT parse event.body. Step Functions passes the object directly.
2. Gets the photo from S3 bucket (use env var PHOTOS_BUCKET)
3. Converts it to base64 (no data:image prefix)
4. Calls Amazon Bedrock using InvokeModelCommand from @aws-sdk/client-bedrock-runtime
5. Model ID: anthropic.claude-3-5-haiku-20241022-v1:0
6. Uses this system prompt for the vision analysis:

"You are a housing condition analyst. Examine this photo and describe what you physically observe. Do NOT diagnose problems or make legal conclusions. Only describe what you see.

For each observation, provide:
- description: what you physically see (e.g., 'dark discoloration on ceiling surface, approximately 2 square feet')
- category: one of: structural, electrical, plumbing, environmental, fire_safety, pest
- confidence: high, medium, or low

Respond ONLY with valid JSON in this format:
{
  \"observations\": [
    { \"description\": \"...\", \"category\": \"...\", \"confidence\": \"...\" }
  ]
}"

7. Parses the JSON response using: JSON.parse(new TextDecoder().decode(response.body)).content[0].text
8. Returns the parsed observations object
9. Includes try/catch error handling
10. Lambda timeout: 90 seconds, Memory: 512MB
```

**11:00 — Spec 2: Stage 2 Code Matching Lambda**
```
Create a new Spec. Build a Lambda at src/backend/lambdas/stage2-matching.ts.

Follow api-reference.md steering file for ALL SDK patterns.

This Lambda:
1. Receives input from Step Functions: { observations: [...], photoKey, address, jurisdiction }
2. Extracts unique categories from observations array
3. For each category, queries DynamoDB table (env var CODES_TABLE, partition key "category")
4. Collects all matching code entries
5. Sends observations + retrieved codes to Bedrock Claude Haiku
6. Uses this prompt:

"You are a housing code compliance analyst for Virginia.

Given these observations from a photo inspection and these housing code sections, determine which codes are likely being violated.

## Observations
{observations_json}

## Relevant Housing Code Sections
{dynamodb_results_json}

For each violation, respond ONLY with valid JSON:
{
  \"violations\": [
    {
      \"code_display\": \"IPMC §305.3\",
      \"code_section\": \"IPMC_305_3\",
      \"title\": \"Interior Surfaces\",
      \"match_reasoning\": \"explanation of why this observation matches this code\",
      \"plain_english\": \"plain English explanation for the tenant\",
      \"confidence\": \"high\",
      \"observation_ref\": \"the observation description this matches\"
    }
  ]
}

ONLY cite codes that appear in the provided housing code sections. Do NOT invent code numbers."

7. After getting AI response, VERIFY every cited code_display exists in DynamoDB results
8. Filter out any citations where code_display doesn't match a real entry
9. Return: { violations: [...], photoKey, address, jurisdiction }
```

**12:00 — Spec 3: Stage 3 Complaint Generation Lambda**
```
Create a new Spec. Build a Lambda at src/backend/lambdas/stage3-complaint.ts.

Follow api-reference.md steering file for ALL SDK patterns.

This Lambda:
1. Receives from Step Functions: { violations: [...], photoKey, address, jurisdiction }
2. Queries DynamoDB table (env var CONTACTS_TABLE) by jurisdiction (partition key)
3. Gets enforcement contact info
4. Sends violations + address + contacts to Bedrock to generate complaint letter
5. Uses this prompt:

"You are a tenant rights documentation assistant for Virginia.

Generate a formal complaint letter to code enforcement. Use this information:

## Property Information
Address: {address}
Date: {current_date}
Jurisdiction: {jurisdiction}

## Violations Found
{violations_json}

## Filing Contact
{contacts_json}

Write a professional, firm complaint letter that:
- Addresses the appropriate code enforcement office
- States specific code sections being violated (use exact code_display values)
- Describes the observed conditions
- Requests an inspection
- Includes the date and property address
- Uses formal but accessible language
- Ends with: 'This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance.'

Respond with JSON:
{
  \"letter\": \"full complaint letter text\",
  \"summary\": \"1-2 sentence summary of violations found\"
}"

6. Bundle the response with evidence log and contacts
7. Return complete results object:
{
  violations: [...],
  letter: "...",
  summary: "...",
  evidenceLog: { timestamp, address, photoKey, jurisdiction },
  contacts: [...]
}
```

**1:00 PM — Lunch, then Spec 4: Step Functions + Orchestrator + API Gateway**
```
Create a new Spec. I need:

1. An AWS Step Functions Express Workflow state machine definition (JSON) that chains:
   stage1-vision Lambda → stage2-matching Lambda → stage3-complaint Lambda
   Each stage passes its output as the next stage's input.

2. An orchestrator Lambda at src/backend/lambdas/orchestrator.ts that:
   - Receives API Gateway event with body: { photoKey, address, jurisdiction }
   - Calls StartSyncExecution on the state machine (env var STATE_MACHINE_ARN)
   - Returns the final output with CORS headers
   - Follow api-reference.md for Step Functions SDK patterns

3. A get-upload-url Lambda at src/backend/lambdas/get-upload-url.ts that:
   - Generates a pre-signed S3 PUT URL for photo upload
   - Returns { uploadUrl, photoKey } with CORS headers
   - Follow api-reference.md for S3 presigner patterns

4. API Gateway HTTP API configuration with:
   - POST /get-upload-url → get-upload-url Lambda
   - POST /analyze → orchestrator Lambda
   - CORS: Allow-Origin *, Allow-Headers Content-Type, Allow-Methods POST OPTIONS
```

**2:00 PM — Share API URL with Person B. Debug CORS issues.**

---

### PERSON B (Frontend / UX) — START IMMEDIATELY

**10:00-10:10 — Setup**
1. Clone repo, open in Kiro
2. Verify `.kiro/steering/` files are there (Person A creates them)
3. Click "Generate Steering Docs" in Kiro
4. Initialize React + Vite + Tailwind:
```
npm create vite@latest src/frontend -- --template react-ts
cd src/frontend
npm install
npm install -D tailwindcss @tailwindcss/vite
```

**10:15 — Spec 5: Upload Page**
Tell Kiro:
```
Create a new Spec. Build the upload page at src/frontend/src/pages/UploadPage.tsx.

Follow frontend-standards.md steering file. Include EVERY element described there for the Upload Page.

Specifically:
- App name "WITNESS" with tagline "Know your rights. Document violations. Take action."
- Large camera capture button (uses <input type="file" accept="image/*" capture="environment">)
- Drag-and-drop upload zone for desktop
- Photo preview thumbnail after selection
- Address text input (placeholder: "123 Turner St, Blacksburg, VA")
- Jurisdiction dropdown: "Blacksburg, VA" (default), "Montgomery County, VA"
- Analyze button (disabled until photo selected, shows spinner when loading)
- Footer disclaimer: "Documentation assistance only. Not legal advice."
- Use Tailwind CSS. Mobile-first (375px min width).
- Load Google Font: DM Serif Display for headings, DM Sans for body
- Color palette from frontend-standards.md
- File validation: only jpg/png/webp, max 10MB
```

**11:00 — Spec 6: Processing Page**
```
Create a new Spec. Build the processing page at src/frontend/src/pages/ProcessingPage.tsx.

Follow frontend-standards.md. Include:
- Uploaded photo displayed at top
- "Analyzing your documentation..." header
- 4 stage indicators that transition: gray circle → spinning → green check
  1. "Inspecting photo..."
  2. "Matching building codes..."
  3. "Generating complaint letter..."
  4. "Finding enforcement contacts..."
- Progress bar
- "Estimated time: ~15-20 seconds"
- Cancel button (returns to upload page)
- Match design system from Upload page (same fonts, colors)
- Use Tailwind CSS
```

**12:00 — Spec 7: Results Dashboard**
```
Create a new Spec. Build the results dashboard at src/frontend/src/pages/ResultsPage.tsx.

Follow frontend-standards.md. Include ALL sections A through F exactly:

Section A: Summary card — "X Potential Violations Found", confidence, address + date
Section B: Violation cards — severity dot (red/yellow/gray), code citation badge, title, observation text, plain English, confidence bar, expandable full code text
Section C: Complaint letter display with "Copy to Clipboard" and "Download as PDF" buttons
Section D: How to File section with EXACT contact info from frontend-standards.md:
  - Step 1: Online form at tobweb.org/ayr/ with copy button
  - Step 2: In person at 300 South Main St, Blacksburg with download button
  - Step 3: Phone numbers: (540) 443-1612, (540) 443-1300
  - Montgomery County: (540) 382-6120 ext. 160
  - Virginia DHCD: (804) 371-7150
Section E: Evidence log with timestamp and coordinates
Section F: Disclaimer footer + "Analyze Another Photo" button

Cards fade in with staggered animation (0.1s delay). Use Tailwind CSS.
```

**2:00 PM — Spec 8: Connect to Real API**
```
Update the upload page and add routing to connect frontend to the real backend API.

1. On photo upload: call POST {API_BASE_URL}/get-upload-url to get pre-signed URL
2. Upload photo directly to S3 using the pre-signed URL (PUT request)
3. Call POST {API_BASE_URL}/analyze with { photoKey, address, jurisdiction }
4. Show ProcessingPage while waiting (simulate stage progress with timers)
5. Display ResultsPage when response arrives
6. Handle errors: show user-friendly error message, allow retry
7. Use React Router for page navigation
8. API_BASE_URL should be an environment variable (VITE_API_URL)
```

---

### PERSON C (Research + Data + Pitch) — START IMMEDIATELY

**10:00-10:15 — Verify Data Files**
1. Confirm `housing-codes.json` is in the repo (15 entries from TONIGHT-TASKS.md)
2. Confirm `enforcement-contacts.json` is in the repo
3. If missing, create them NOW from the data in TONIGHT-TASKS.md and FINAL-BUILD-PLAN.md

**10:15-11:00 — Seed DynamoDB**
1. Go to AWS Console → DynamoDB → Tables → HousingCodes
2. Click "Explore table items" → "Create item"
3. For each entry in housing-codes.json, create an item. OR:
4. Use the AWS CLI (faster):
```bash
# Install AWS CLI if needed, configure with credentials
# Then run the seed script:
aws dynamodb batch-write-item --request-items file://housing-codes-batch.json --region us-east-1
```
5. Do the same for EnforcementContacts table

**11:00-12:00 — Test Prompts in Bedrock Playground**
1. AWS Console → Bedrock → Playgrounds → Chat
2. Select Claude Haiku model
3. Upload a demo photo
4. Paste Stage 1 prompt, check output quality
5. If output is good, move to Stage 2 prompt with hardcoded Stage 1 output
6. Iterate and refine prompts if needed
7. Share any prompt improvements with Person A immediately

**12:00-2:00 — Draft Pitch**
- Opening hook: "44 million renters. 1 in 10 violations reported."
- Problem statement
- Demo walkthrough (describe what audience will see)
- Technical architecture (7 AWS services, 3-stage AI pipeline)
- How we used Kiro (specs, steering, hooks — show the .kiro directory)
- Social impact
- Q&A prep (use judge objection answers from FINAL-BUILD-PLAN.md)

**2:00-4:00 — Full Demo Testing**
- Run 5 demo photos through the pipeline
- Note any issues, report to Person A/B immediately
- Refine prompts based on real output

**4:00 onward — Stop coding. Practice pitch.**
- 3 full run-throughs with team
- Time each section
- Prepare Devpost submission

---

## 5. KIRO POWER TIPS — MAXIMIZE OUTPUT, MINIMIZE TOKENS

### How to prompt Kiro efficiently:

1. **Always reference steering files** — "Follow api-reference.md" saves you from writing SDK patterns in every prompt
2. **One spec per feature** — Don't combine backend + frontend in one spec
3. **Use #filename syntax** to point Kiro to existing code: "Update #src/frontend/src/pages/UploadPage.tsx to add the API integration"
4. **Use Vibe mode for quick fixes** — "Fix the CORS error in #src/backend/lambdas/orchestrator.ts" 
5. **Use Spec mode for new features** — Always for anything > 20 lines of code
6. **If Kiro loses context**: "Read the steering files in .kiro/steering/ and review the current project structure."
7. **Test after every spec** — Don't stack 3 specs without testing

### When to use Spec mode vs Vibe mode:
- **Spec mode**: New Lambda functions, new React pages, new features, anything structural
- **Vibe mode**: Bug fixes, CORS fixes, style tweaks, small changes, "add a loading spinner to this button"

---

## 6. CRITICAL TIMELINE CHECKPOINTS

| Time | Must Be True | If Not |
|---|---|---|
| **11:00** | Stage 1 Lambda works with test photo | Simplify: single Lambda instead of Step Functions |
| **12:00** | Upload page renders, Stage 2 works | Person B: skip loading page, go straight to results |
| **1:30** | Stage 3 works, frontend has 2+ pages | Person A: skip Step Functions, chain calls in one Lambda |
| **3:00** | End-to-end flow works (upload → results) | Everyone: all hands on fixing the critical path |
| **5:00** | Screen-record backup demo | If demo breaks during presentation, play the video |
| **6:00** | FEATURE FREEZE | Only critical bug fixes after this |

---

## 7. QUICK REFERENCE — KEY VALUES

| Item | Value |
|---|---|
| AWS Region | us-east-1 |
| Bedrock Model | anthropic.claude-3-5-haiku-20241022-v1:0 |
| DynamoDB Table 1 | HousingCodes (category + code_section) |
| DynamoDB Table 2 | EnforcementContacts (jurisdiction + contact_type) |
| S3 Bucket | witness-photos-hackathon |
| API Endpoints | POST /get-upload-url, POST /analyze |
| Code Inspector Phone | (540) 443-1612 |
| Online Form | tobweb.org/ayr/ |
| Planning & Building | (540) 443-1300 |
| Montgomery County | (540) 382-6120 ext. 160 |
| VA DHCD | (804) 371-7150 |

---

**It's 10 AM. Person A: create steering files. Person B: init React. Person C: verify data. GO.**
