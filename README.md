# Witness — AI Housing Violation Detector

Witness helps Virginia tenants document housing code violations using AI vision, real code databases, and automated complaint letter generation.

Upload a photo → get a formal, legally-grounded complaint letter in seconds.

---

## How It Works

1. **Upload** — Tenant photographs a housing issue (electrical hazard, mold, structural damage, etc.)
2. **Analyze** — Claude Haiku 4.5 vision identifies observable conditions in the photo
3. **Match** — Conditions are cross-referenced against a real DynamoDB housing code database (anti-hallucination: only verified citations appear)
4. **Generate** — A formal complaint letter is created with exact code citations and local enforcement contacts

---

## Architecture

```
Browser
  │
  ├─ GET  /get-upload-url  ──► Lambda (get-upload-url)
  │                                   └─ S3 pre-signed PUT URL
  │
  ├─ PUT  [pre-signed URL] ──► S3 Bucket (witness-photos-hackathon)
  │
  └─ POST /analyze  ─────────► Lambda (orchestrator)
                                        └─ Step Functions Express Workflow
                                                ├─ Stage 1: Lambda (stage1-vision)
                                                │     └─ Bedrock Claude Haiku 4.5 (vision)
                                                │           Describes visible conditions → JSON
                                                │
                                                ├─ Stage 2: Lambda (stage2-matching)
                                                │     └─ DynamoDB query (HousingCodes table)
                                                │           Verifies each AI citation against DB
                                                │           Filters hallucinated codes out
                                                │
                                                └─ Stage 3: Lambda (stage3-complaint)
                                                      └─ Bedrock Claude Haiku 4.5 (text)
                                                            DynamoDB query (EnforcementContacts)
                                                            Generates formal complaint letter
```

### AWS Services

| Service | Purpose |
|---|---|
| API Gateway | HTTP API — single entry point for browser |
| Lambda (×5) | Business logic — get-upload-url, orchestrator, stage1, stage2, stage3 |
| Step Functions | Express workflow — orchestrates the 3-stage pipeline |
| S3 | Photo storage via pre-signed upload URLs |
| DynamoDB | Housing codes + enforcement contacts database |
| Bedrock | Claude Haiku 4.5 — vision analysis + complaint generation |
| IAM | WitnessLambdaRole — scoped permissions for all Lambdas |

### AI Pipeline (3 Stages)

**Stage 1 — Vision Analysis**
- Downloads photo from S3
- Calls Bedrock with image + prompt
- Returns structured JSON: observations with category + confidence

**Stage 2 — Code Matching (Anti-Hallucination)**
- Takes Stage 1 observations
- Calls Bedrock to suggest relevant code sections
- Queries DynamoDB to verify each suggestion is a real code
- Filters out any unverified citations → 100% accuracy guarantee

**Stage 3 — Complaint Generation**
- Takes verified violations from Stage 2
- Queries DynamoDB for local enforcement contacts by jurisdiction
- Calls Bedrock to generate a formal complaint letter
- Returns violations + letter + contacts as final JSON

---

## Project Structure

```
witness/
├── frontend/                   # Production frontend (3 HTML files)
│   ├── index.html              # Upload page (WebGL particles, drag-drop)
│   ├── loading.html            # Scan animation (WebGL grid scan)
│   ├── results.html            # Results page (complaint letter + contacts)
│   ├── config.js               # API base URL + mock fallback
│   └── serve.mjs               # Local dev server
│
├── src/backend/
│   ├── lambdas/
│   │   ├── get-upload-url.ts   # Generates S3 pre-signed upload URLs
│   │   ├── orchestrator.ts     # API Gateway handler → Step Functions
│   │   ├── stage1-vision.ts    # Bedrock vision analysis
│   │   ├── stage2-matching.ts  # DynamoDB code verification
│   │   ├── stage3-complaint.ts # Letter generation + contacts
│   │   └── send-complaint.ts   # (Future) email delivery
│   ├── utils/
│   │   ├── bedrock-client.ts   # Bedrock API wrapper (text + vision)
│   │   ├── dynamodb-client.ts  # DynamoDB wrapper
│   │   └── cors.ts             # CORS headers
│   ├── types/index.ts          # Shared TypeScript types
│   ├── scripts/
│   │   └── seed-dynamodb.ts    # Seeds HousingCodes + EnforcementContacts
│   └── data/
│       ├── housing-codes.json  # 22 Virginia housing code entries (VMC + Va. Code §)
│       └── enforcement-contacts.json  # 6 Blacksburg enforcement contacts
│
├── data/                       # Source data files
├── demo-photos/                # Sample violation photos for testing
└── prompts/                    # AI prompt templates for each stage
```

---

## Live Deployment

| Resource | Value |
|---|---|
| API Base URL | `https://mbqglb3kxc.execute-api.us-east-1.amazonaws.com` |
| S3 Bucket | `witness-photos-hackathon` (us-east-1) |
| Bedrock Model | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| DynamoDB | `HousingCodes` + `EnforcementContacts` tables |

---

## Running Locally

```bash
# Serve frontend
cd frontend
node serve.mjs
# Open http://localhost:3000

# Rebuild backend (after code changes)
cd src/backend
npm run build
npx esbuild dist/lambdas/stage1-vision.js --bundle --platform=node --target=node22 --outfile=dist/bundle-stage1.js --external:@aws-sdk/*
# Upload zip to Lambda via AWS console
```

---

## Data

**Housing Codes (22 entries)** — Virginia Maintenance Code + Virginia statutes:
- `VMC § 305.1` Interior Condition
- `VMC § 604.1–605.1` Electrical System
- `VMC § 702.1–704.1` Fire Safety
- `Va. Code § 55.1-1220` Landlord duties (habitability, mold, heating, etc.)

**Enforcement Contacts (6 entries)** — Blacksburg, VA:
- Code Inspector, Planning & Building, Online form, In-person, State escalation (DHCD)

---

## Security Notes

- No authentication (hackathon scope)
- CORS set to `*` — restrict for production
- Pre-signed S3 URLs expire in 5 minutes
- No PII stored — photos processed and not retained
- Input validation on address (XSS protection) and file type/size

---

Built for the **AWS + Kiro Hackathon** · Virginia (Blacksburg) · March 2026
