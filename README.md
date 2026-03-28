# Witness — AI Housing Violation Detector

> Upload a photo of a housing condition. Get a formal, code-cited complaint letter in seconds.

Built for the **AWS + Kiro Hackathon** · March 2026 · Blacksburg, VA

**Live API:** `https://mbqglb3kxc.execute-api.us-east-1.amazonaws.com`

---

## The Problem

44 million American renter households. HUD estimates only 1 in 10 housing violations gets formally reported — not because tenants don't care, but because they don't know what to say. Complaint forms are blank text boxes. "I have mold" gets buried. "Violation of VMC § 305.1 with timestamped photographic evidence" gets prioritized. Code enforcement agencies rank complaints by specificity and documentation quality. Witness closes that gap.

---

## What It Does

1. **Upload** — Tenant photographs a housing issue on their phone
2. **Analyze** — Claude Haiku 4.5 vision identifies observable conditions in the photo
3. **Match** — Conditions are cross-referenced against a real DynamoDB housing code database (anti-hallucination: only database-verified citations appear)
4. **Generate** — A formal complaint letter is created with exact code sections, legal language, and local enforcement contacts
5. **Act** — Tenant copies, downloads, or files the letter with one click

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (index.html → loading.html → results.html)             │
│  WebGL particle animation · WebGL grid scan · Styled letter UI  │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Gateway (HTTP API)                                         │
│  POST /analyze          POST /get-upload-url                    │
└──────────┬──────────────────────────┬──────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌──────────────────────────┐
│  Lambda             │   │  Lambda                  │
│  orchestrator       │   │  get-upload-url          │
│  Parses request     │   │  Generates pre-signed    │
│  → Step Functions   │   │  S3 PUT URL (5 min TTL)  │
└──────────┬──────────┘   └────────────┬─────────────┘
           │                           │
           ▼                           ▼
┌────────────────────────────────┐   ┌─────────────────────────┐
│  Step Functions Express        │   │  S3 Bucket              │
│  WitnessStateMachine           │   │  witness-photos-hackathon│
│                                │   │  (us-east-1)            │
│  ┌─────────────────────────┐   │   └─────────────────────────┘
│  │ Stage 1 — Vision        │   │
│  │ Lambda: stage1-vision   │   │
│  │ • Downloads photo from S3│  │
│  │ • Calls Bedrock (vision) │  │
│  │ • Returns observations  │   │
│  └────────────┬────────────┘   │
│               ▼                │
│  ┌─────────────────────────┐   │
│  │ Stage 2 — Matching      │   │
│  │ Lambda: stage2-matching │   │
│  │ • Bedrock suggests codes│   │
│  │ • DynamoDB verifies each│   │
│  │ • Filters hallucinations│   │
│  └────────────┬────────────┘   │
│               ▼                │
│  ┌─────────────────────────┐   │
│  │ Stage 3 — Generation    │   │
│  │ Lambda: stage3-complaint│   │
│  │ • Fetches contacts from │   │
│  │   DynamoDB by jurisdiction│ │
│  │ • Bedrock generates     │   │
│  │   formal complaint letter│  │
│  │ • Returns full JSON     │   │
│  └─────────────────────────┘   │
└────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  DynamoDB                                                       │
│  HousingCodes table          EnforcementContacts table          │
│  PK: category                PK: jurisdiction                   │
│  22 VMC + Va. Code entries   6 Blacksburg contacts             │
└─────────────────────────────────────────────────────────────────┘
```

---

## AWS Services

| Service | Usage |
|---|---|
| **API Gateway** | HTTP API — single entry point for browser requests |
| **Lambda (×5)** | `orchestrator`, `get-upload-url`, `stage1-vision`, `stage2-matching`, `stage3-complaint` |
| **Step Functions** | Express workflow — orchestrates the 3-stage AI pipeline with retry logic |
| **S3** | Photo storage via pre-signed upload URLs (5-minute expiry, no server needed) |
| **DynamoDB** | `HousingCodes` table (22 entries) + `EnforcementContacts` table (6 entries) |
| **Bedrock** | Claude Haiku 4.5 (`us.anthropic.claude-haiku-4-5-20251001-v1:0`) — vision + text generation |
| **IAM** | `WitnessLambdaRole` — scoped S3, DynamoDB, Bedrock, Step Functions permissions |

---

## The AI Pipeline (3 Stages)

### Stage 1 — Vision Analysis
Lambda `stage1-vision` downloads the photo from S3 and sends it to Bedrock Claude Haiku 4.5 with a structured vision prompt. The model returns a JSON array of observations — each with a `description`, `category` (structural/electrical/plumbing/environmental/fire_safety/pest/heating), and `confidence` level. The model is explicitly instructed to describe only what it physically sees — no diagnosis, no legal conclusions.

### Stage 2 — Code Matching (Anti-Hallucination)
Lambda `stage2-matching` takes the Stage 1 observations and asks Bedrock to suggest relevant housing code sections. Crucially, **every suggested code is then queried against DynamoDB**. If the code section does not exist in the `HousingCodes` table, it is silently discarded. Only verified citations make it to Stage 3. This is what separates Witness from asking ChatGPT — every citation in the output is real.

### Stage 3 — Complaint Generation
Lambda `stage3-complaint` takes the verified violations from Stage 2, queries DynamoDB for the relevant enforcement contacts by jurisdiction, then calls Bedrock to generate a formal complaint letter. The output JSON includes: `observations`, `violations` (with code sections, plain-English explanations, severity, confidence), `complaint_letter`, `evidence_log`, and `contacts`.

---

## Frontend Design

Three single-page HTML files — no framework, no build step required.

| Page | Description |
|---|---|
| `index.html` | Upload page — drag-drop zone, address input, jurisdiction select. WebGL particle animation (200 floating particles in tan/rust/cream palette). Shine sweep animation on logo. How It Works + FAQ sections. |
| `loading.html` | Scan animation — WebGL grid scan effect (ported from GridScan.jsx). Two-stage progress: "Scanning image" → "Matching housing codes". Real violation codes populate the match grid as API returns. |
| `results.html` | Results page — violation header with severity chips, structured complaint letter with styled violation boxes (code chips, section headers), local enforcement contacts panel. Copy + download buttons. |

**Design System** (samhith theme):
- Background: `#15110D` · Surface: `#1C1610` · Elevated: `#231B13`
- Text: `#EBE1D1` (cream) · Accent: `#C8A47E` (tan) · Action: `#C2522F` (rust)
- Fonts: Cormorant Garamond (serif headlines) + DM Sans (body) + DM Mono (mono labels)
- Grain texture overlay · Backdrop blur nav

---

## Project Structure

```
witness/
├── frontend/                       # Production frontend (no build needed)
│   ├── index.html                  # Upload page (WebGL particles, drag-drop, validation)
│   ├── loading.html                # Scan animation (WebGL grid, real-time violation feed)
│   ├── results.html                # Results (complaint letter renderer, contacts)
│   ├── config.js                   # API base URL + mock fallback result
│   └── serve.mjs                   # Local dev server (node serve.mjs → localhost:3000)
│
├── src/backend/
│   ├── lambdas/
│   │   ├── get-upload-url.ts       # S3 pre-signed URL generation
│   │   ├── orchestrator.ts         # API Gateway → Step Functions bridge
│   │   ├── stage1-vision.ts        # Bedrock vision analysis
│   │   ├── stage2-matching.ts      # DynamoDB citation verification
│   │   ├── stage3-complaint.ts     # Letter generation + contacts lookup
│   │   └── send-complaint.ts       # (Future) email delivery
│   ├── utils/
│   │   ├── bedrock-client.ts       # Bedrock API wrapper (text + vision)
│   │   ├── dynamodb-client.ts      # DynamoDB wrapper
│   │   └── cors.ts                 # CORS headers for all responses
│   ├── types/index.ts              # Shared TypeScript types (Stage1Input/Output, etc.)
│   ├── scripts/
│   │   └── seed-dynamodb.ts        # Seeds HousingCodes + EnforcementContacts tables
│   └── data/
│       ├── housing-codes.json      # 22 Virginia housing code entries
│       └── enforcement-contacts.json  # 6 Blacksburg enforcement contacts
│
├── data/                           # Source data (housing codes + contacts JSON)
├── demo-photos/                    # Sample violation photos for testing
├── prompts/                        # AI prompt templates for each pipeline stage
├── scripts/
│   ├── demo-script.md              # Devpost video script (2.5 min, with screen cues)
│   └── judge-qa.md                 # 20 judge Q&A with specific answers from code
└── .kiro/
    ├── steering/                   # AI guidance files (tech.md, structure.md, product.md)
    └── specs/                      # Spec-driven development (requirements → design → tasks)
```

---

## Housing Code Database

**22 Virginia code entries** covering:

| Category | Codes |
|---|---|
| Structural | VMC § 304.7 (Roofs), VMC § 305.1 (Interior), VMC § 306.1 (Exterior) |
| Electrical | VMC § 604.1 (System), VMC § 604.3 (Hazards), VMC § 605.1 (Components) |
| Plumbing | VMC § 502.1 (Fixtures), VMC § 504.1 (Water Heating) |
| Fire Safety | VMC § 702.1 (Means of Egress), VMC § 704.1 (Fire Protection), VMC § 704.6 (Smoke Alarms) |
| Environmental | VMC § 308.1 (Pest Control), VMC § 309.1 (Infestation) |
| Heating | VMC § 602.1 (Heating Facilities), VMC § 603.1 (Mechanical Equipment) |
| Virginia Statutes | Va. Code § 55.1-1220(A)(1–5) (Landlord duties: codes, habitability, heat, water, mold) |

**6 Blacksburg enforcement contacts:**
- Blacksburg Code Inspector — `(540) 443-1612`
- Blacksburg Planning and Building — `(540) 443-1300`
- Online Request Form — `tobweb.org/ayr/`
- In-person — 300 South Main St, Blacksburg, VA 24060
- Virginia DHCD (state escalation) — `(804) 371-7150`

---

## Running Locally

```bash
# Serve the frontend
cd frontend
node serve.mjs
# Open http://localhost:3000

# Rebuild backend after code changes
cd src/backend
npm install
npm run build

# Bundle a Lambda for deployment
npx esbuild dist/lambdas/stage1-vision.js \
  --bundle --platform=node --target=node22 \
  --outfile=dist/bundle-stage1.js \
  --external:@aws-sdk/*

# Seed DynamoDB (requires AWS credentials)
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1
npx tsx scripts/seed-dynamodb.ts
```

---

## How We Used Kiro

- **Spec-driven development** — Every feature started as a formal spec in `.kiro/specs/` (requirements → design → tasks). The backend API, email sender, and network bugfix each have their own spec directory.
- **Steering files** — `.kiro/steering/tech.md`, `structure.md`, and `product.md` taught Kiro our AWS SDK patterns, import conventions, and product decisions. This prevented wrong library suggestions and kept code consistent across all 5 Lambda functions.
- **Hooks** — Auto-commit on save and `tsc --noEmit` type checking on every edit, configured in `.kiro/hooks/hooks.json`.
- **The entire `.kiro/` directory is committed** to the repo as evidence of spec-driven development throughout the build.

---

## Security

- No authentication (hackathon scope — demo only)
- CORS set to `*` — restrict for production
- Pre-signed S3 URLs expire in 5 minutes
- Input validation: file type (image/*), size (20 MB max), address XSS protection
- No PII stored — photos processed transiently, not retained
- IAM role scoped to minimum required permissions (S3 read, DynamoDB read/write, Bedrock invoke, SFN start)

---

## Cost (Hackathon Demo)

| Service | Estimated Cost |
|---|---|
| S3 storage + transfer | ~$0.01 |
| DynamoDB (on-demand) | ~$0.00 |
| Lambda invocations | ~$0.00 (free tier) |
| Step Functions Express | ~$0.01 |
| API Gateway | ~$0.00 (free tier) |
| Bedrock (Claude Haiku 4.5) | ~$0.002 per analysis |
| **Total per analysis** | **< $0.01** |

---

## Team

Built at Virginia Tech · Blacksburg, VA · March 2026

---

*Witness. Know your rights. Document violations. Take action.*
