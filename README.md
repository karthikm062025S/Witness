# Witness

Upload a photo of a housing condition, get back a formal, statute-cited complaint letter.

**Devpost:** https://devpost.com/software/witness-f9ijzq · built at the AWS + Kiro Hackathon, Virginia Tech, Blacksburg VA, March 2026.

The public API endpoint was removed after the hackathon; the Devpost page has the demo. To run it yourself, see [Run it locally](#run-it-locally).

## How it works

![What a tenant does](docs/diagrams/1-what-a-tenant-does.png)
A tenant uploads a photo and gets back a plain-language explanation with a formal letter attached.

![The serverless pipeline](docs/diagrams/2-the-serverless-pipeline.png)
API Gateway kicks off a 3-stage Step Functions pipeline across 5 Lambdas: vision, citation matching, then letter drafting.

![How citations are verified](docs/diagrams/3-how-citations-are-verified.png)
Every code citation the model suggests is checked against DynamoDB before it reaches the letter.

Editable sources for each diagram are in [`docs/diagrams/`](docs/diagrams/) (`.excalidraw` files, open at excalidraw.com).

## Why the citations can be trusted

The model only *suggests* candidate Virginia housing-code citations, it never gets to decide what's real. Stage 2 exact-matches every suggestion against a DynamoDB table seeded with 30+ real provisions, and anything that doesn't match is silently dropped before it reaches the tenant.

## Built with

| Service | Role |
| --- | --- |
| AWS Lambda (x5, Node.js 22, TypeScript) | Vision analysis, citation matching, letter drafting |
| Step Functions Express | 3-stage pipeline orchestration |
| Amazon Bedrock (Claude Haiku 4.5) | Vision + text generation |
| API Gateway | `POST /analyze`, `POST /get-upload-url` |
| S3 | Pre-signed photo uploads |
| DynamoDB | Housing codes + enforcement contacts (2 tables) |
| IAM | Least-privilege role per Lambda |

## Run it locally

```bash
# Serve the frontend
cd frontend
node serve.mjs
# Open http://localhost:3000

# Rebuild backend after code changes
cd src/backend
npm install
npm run build

# Seed DynamoDB (requires AWS credentials)
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
export AWS_DEFAULT_REGION=us-east-1
npx tsx scripts/seed-dynamodb.ts
```

## Team

Built by a 4-person team at the AWS + Kiro Hackathon, Virginia Tech, Blacksburg VA, March 2026.
