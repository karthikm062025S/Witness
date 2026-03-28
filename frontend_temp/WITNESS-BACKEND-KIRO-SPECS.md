# WITNESS — BACKEND SPEC-DRIVEN PLAN FOR KIRO
### Person A (You) — Backend Only. Copy-paste each prompt into Kiro.

---

## YOUR SPEC ORDER (do these in sequence, test between each)

```
SPEC 0  → Project scaffold + steering files + shared types     (10:00)
SPEC 1  → Stage 1: Vision Analysis Lambda                      (10:15)
  TEST → Invoke in AWS console with demo photo
SPEC 2  → Stage 2: Code Matching Lambda                        (11:00)
  TEST → Invoke with hardcoded Stage 1 output
SPEC 3  → Stage 3: Complaint Generation Lambda                 (12:00)
  TEST → Invoke with hardcoded Stage 2 output
SPEC 4  → Get-Upload-URL Lambda                                (1:00)
  TEST → Call endpoint, verify pre-signed URL works
SPEC 5  → Step Functions state machine + Orchestrator Lambda    (1:30)
  TEST → Full pipeline with demo photo
SPEC 6  → API Gateway HTTP API                                 (2:00)
  TEST → curl both endpoints, share URL with frontend teammate
SPEC 7  → DynamoDB seed script                                 (if Person C hasn't done it)
```

---

## SPEC 0 — PROJECT SCAFFOLD (10:00-10:10)

**Mode: Vibe (chat mode, not full spec)**

Paste this into Kiro chat:

```
I need you to set up the backend project structure for a serverless AWS application. Do the following:

1. Create this directory structure:
   witness/
   ├── src/
   │   ├── backend/
   │   │   ├── lambdas/
   │   │   │   ├── stage1-vision.ts
   │   │   │   ├── stage2-matching.ts
   │   │   │   ├── stage3-complaint.ts
   │   │   │   ├── orchestrator.ts
   │   │   │   └── get-upload-url.ts
   │   │   └── utils/
   │   │       └── bedrock-client.ts
   │   └── shared/
   │       └── types.ts
   ├── data/
   │   ├── housing-codes.json
   │   └── enforcement-contacts.json
   ├── prompts/
   │   ├── stage1-vision.md
   │   ├── stage2-matching.md
   │   └── stage3-complaint.md
   ├── infra/
   │   └── step-functions-definition.json
   └── scripts/
       └── seed-dynamodb.ts

2. Create src/backend/package.json with these exact dependencies:
   {
     "name": "witness-backend",
     "type": "module",
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

3. Create src/backend/tsconfig.json for Node.js 20 with ES2022 target, ESNext modules, strict mode.

4. Create src/shared/types.ts with these exact TypeScript interfaces:

   export interface Observation {
     description: string;
     category: 'structural' | 'electrical' | 'plumbing' | 'environmental' | 'fire_safety' | 'pest';
     confidence: 'high' | 'medium' | 'low';
   }

   export interface Stage1Output {
     observations: Observation[];
     photoKey: string;
     address: string;
     jurisdiction: string;
   }

   export interface Violation {
     code_display: string;
     code_section: string;
     title: string;
     match_reasoning: string;
     plain_english: string;
     confidence: 'high' | 'medium' | 'low';
     observation_ref: string;
   }

   export interface Stage2Output {
     violations: Violation[];
     photoKey: string;
     address: string;
     jurisdiction: string;
   }

   export interface EnforcementContact {
     jurisdiction: string;
     contact_type: string;
     office_name: string;
     department: string;
     phone: string;
     online_form?: string;
     address?: string;
     hours?: string;
     notes?: string;
   }

   export interface Stage3Output {
     violations: Violation[];
     letter: string;
     summary: string;
     evidenceLog: {
       timestamp: string;
       address: string;
       photoKey: string;
       jurisdiction: string;
     };
     contacts: EnforcementContact[];
   }

   export interface AnalyzeRequest {
     photoKey: string;
     address: string;
     jurisdiction: string;
   }

   export interface UploadUrlResponse {
     uploadUrl: string;
     photoKey: string;
   }

5. Create src/backend/utils/bedrock-client.ts with a reusable Bedrock helper:

   import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

   const client = new BedrockRuntimeClient({ region: "us-east-1" });
   const MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0";

   export async function callBedrock(messages: any[], maxTokens = 2048): Promise<string> {
     const response = await client.send(new InvokeModelCommand({
       modelId: MODEL_ID,
       contentType: "application/json",
       accept: "application/json",
       body: JSON.stringify({
         anthropic_version: "bedrock-2023-05-31",
         max_tokens: maxTokens,
         messages
       })
     }));
     const result = JSON.parse(new TextDecoder().decode(response.body));
     return result.content[0].text;
   }

   export async function callBedrockWithImage(base64Image: string, prompt: string, maxTokens = 2048): Promise<string> {
     const response = await client.send(new InvokeModelCommand({
       modelId: MODEL_ID,
       contentType: "application/json",
       accept: "application/json",
       body: JSON.stringify({
         anthropic_version: "bedrock-2023-05-31",
         max_tokens: maxTokens,
         messages: [{
           role: "user",
           content: [
             {
               type: "image",
               source: {
                 type: "base64",
                 media_type: "image/jpeg",
                 data: base64Image
               }
             },
             { type: "text", text: prompt }
           ]
         }]
       })
     }));
     const result = JSON.parse(new TextDecoder().decode(response.body));
     return result.content[0].text;
   }

Do NOT create placeholder content. Create the actual files with the actual code above. Run npm install in src/backend/ after creating package.json.
```

**After this completes:** Verify the files exist, then `cd src/backend && npm install`.

---

## SPEC 1 — STAGE 1: VISION ANALYSIS LAMBDA (10:15)

**Mode: Spec (click + Create New Spec)**

Paste this:

```
Build the Stage 1 Vision Analysis Lambda function.

File: src/backend/lambdas/stage1-vision.ts

Follow the EXACT patterns from the api-reference.md steering file. Do NOT deviate from the imports, model IDs, or response parsing specified there.

## What this Lambda does:
This is a Step Functions task Lambda — it receives input DIRECTLY (not from API Gateway). Do NOT parse event.body.

## Input (from Step Functions):
{
  "photoKey": "uploads/1234-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}

## Processing steps:
1. Extract photoKey, address, jurisdiction from the event object directly
2. Get the photo from S3 using GetObjectCommand
   - Bucket name from environment variable: process.env.PHOTOS_BUCKET
   - Key: photoKey from input
3. Convert the S3 object body to a base64 string (no data:image/jpeg;base64, prefix)
4. Use the callBedrockWithImage helper from src/backend/utils/bedrock-client.ts
5. Use this EXACT system prompt for vision analysis:

"You are a housing condition analyst. Examine this photo and describe what you physically observe about the condition of the space. Do NOT diagnose problems, make legal conclusions, or assume causes. Only describe what you physically see.

For each distinct observation, provide:
- description: a specific description of what you physically see (e.g., 'dark discoloration on ceiling surface, approximately 2 square feet, with irregular edges')
- category: exactly one of: structural, electrical, plumbing, environmental, fire_safety, pest
- confidence: high, medium, or low (how clearly visible is this in the photo)

Respond ONLY with valid JSON. No markdown, no explanation, no preamble:
{
  \"observations\": [
    { \"description\": \"...\", \"category\": \"...\", \"confidence\": \"...\" }
  ]
}"

6. Parse the AI response as JSON. If JSON parsing fails, wrap the error and return empty observations.
7. Return the Stage1Output object: { observations, photoKey, address, jurisdiction }

## Output (passed to Stage 2 via Step Functions):
{
  "observations": [
    {
      "description": "Dark discoloration on ceiling surface, approximately 2 square feet, with irregular edges consistent with moisture damage",
      "category": "environmental",
      "confidence": "high"
    }
  ],
  "photoKey": "uploads/1234-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}

## Error handling:
- Wrap everything in try/catch
- If S3 GetObject fails: return { error: "Failed to retrieve photo", observations: [] }
- If Bedrock call fails: return { error: "AI analysis failed", observations: [] }
- If JSON parse of AI response fails: try to extract JSON from the response string using regex, or return empty observations

## AWS SDK patterns (EXACT):
- Import S3Client, GetObjectCommand from "@aws-sdk/client-s3"
- Import callBedrockWithImage from "../utils/bedrock-client"
- Use types from "../../shared/types"
- Region: us-east-1
- Lambda timeout: 90 seconds, memory: 512MB

## Do NOT:
- Do NOT parse event.body — this is a Step Functions Lambda, not API Gateway
- Do NOT use @aws-sdk/client-bedrock (use client-bedrock-runtime via the helper)
- Do NOT include "data:image/jpeg;base64," prefix in the base64 string
- Do NOT add CORS headers — Step Functions Lambdas don't need them
- Do NOT use require() — use ES module imports
```

### TEST SPEC 1:
After Kiro generates the code, test it:
1. Go to AWS Console → Lambda → create function `witness-stage1-vision`
2. Runtime: Node.js 20.x, Architecture: arm64
3. Upload or paste the compiled code
4. Set environment variable: PHOTOS_BUCKET = your-bucket-name
5. Attach IAM policy: S3 read + Bedrock invoke
6. Create test event:
```json
{
  "photoKey": "uploads/test-mold.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```
7. Upload a demo mold photo to S3 at `uploads/test-mold.jpg` first
8. Invoke. Verify you get observations back with categories.

**If it works → move to Spec 2. If not → fix in Vibe mode before proceeding.**

---

## SPEC 2 — STAGE 2: CODE MATCHING LAMBDA (11:00)

**Mode: Spec (+ Create New Spec)**

```
Build the Stage 2 Code Matching Lambda function.

File: src/backend/lambdas/stage2-matching.ts

Follow api-reference.md steering file for ALL AWS SDK patterns.

## What this Lambda does:
Receives observations from Stage 1, queries DynamoDB for matching housing codes, then uses Bedrock to match observations against real code sections. Includes a CRITICAL citation verification step.

## Input (from Step Functions — Stage 1 output):
{
  "observations": [
    { "description": "...", "category": "environmental", "confidence": "high" }
  ],
  "photoKey": "uploads/1234-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}

## Processing steps:

1. Extract observations, photoKey, address, jurisdiction from event directly (NOT event.body)

2. Extract unique categories from observations array:
   const categories = [...new Set(observations.map(o => o.category))];

3. For EACH category, query DynamoDB table (env var CODES_TABLE = "HousingCodes"):
   - Partition key: category (String)
   - Use QueryCommand from @aws-sdk/lib-dynamodb
   - Collect all matching code entries into a single array called allCodes

4. Also query for category "general" to catch cross-cutting codes (VA Code landlord obligations)

5. Send observations + allCodes to Bedrock using callBedrock helper with this prompt:

"You are a housing code compliance analyst for the state of Virginia.

Given the following observations from a photo inspection of a rental property, and the following relevant housing code sections, determine which codes are likely being violated.

## Observations
{JSON.stringify(observations, null, 2)}

## Relevant Housing Code Sections
{JSON.stringify(allCodes, null, 2)}

For each potential violation, respond ONLY with valid JSON. No markdown, no preamble:
{
  \"violations\": [
    {
      \"code_display\": \"IPMC §305.3\",
      \"code_section\": \"IPMC_305_3\",
      \"title\": \"Interior Surfaces\",
      \"match_reasoning\": \"The observed dark discoloration on the ceiling is consistent with mold or moisture damage, which violates the requirement for surfaces to be maintained in clean and sanitary condition.\",
      \"plain_english\": \"Your ceiling shows signs of mold or moisture damage. Virginia building code requires all interior surfaces to be kept clean, sanitary, and in good condition.\",
      \"confidence\": \"high\",
      \"observation_ref\": \"dark discoloration on ceiling surface\"
    }
  ]
}

CRITICAL RULES:
- ONLY cite code sections that appear in the Relevant Housing Code Sections above
- Do NOT invent or hallucinate code section numbers
- Use the EXACT code_display and code_section values from the provided data
- If no codes match an observation, do not force a match"

6. Parse the AI response as JSON

7. **CITATION VERIFICATION STEP** (this is what makes us different from ChatGPT):
   - Create a Set of all code_display values from allCodes (the DynamoDB results)
   - For each violation in the AI response, check if violation.code_display exists in the Set
   - REMOVE any violation where code_display is NOT in the Set
   - Log how many were filtered out (for debugging)

8. Return Stage2Output: { violations (verified only), photoKey, address, jurisdiction }

## Output:
{
  "violations": [
    {
      "code_display": "IPMC §305.3",
      "code_section": "IPMC_305_3",
      "title": "Interior Surfaces",
      "match_reasoning": "...",
      "plain_english": "...",
      "confidence": "high",
      "observation_ref": "..."
    }
  ],
  "photoKey": "...",
  "address": "...",
  "jurisdiction": "..."
}

## Error handling:
- If DynamoDB query fails: return { violations: [], error: "Database query failed" }
- If Bedrock call fails: return { violations: [], error: "Code matching failed" }
- If JSON parse fails: attempt regex extraction, or return empty violations
- If ALL violations are filtered out by verification: return empty array (this means AI hallucinated everything — better to show nothing than fake codes)

## AWS SDK patterns:
- Import DynamoDBClient from "@aws-sdk/client-dynamodb"
- Import DynamoDBDocumentClient, QueryCommand from "@aws-sdk/lib-dynamodb"
- Import callBedrock from "../utils/bedrock-client"
- Import types from "../../shared/types"
- Do NOT use DocumentClient (that's v2)
- Do NOT parse event.body

## DynamoDB query pattern:
const result = await dynamodb.send(new QueryCommand({
  TableName: process.env.CODES_TABLE,
  KeyConditionExpression: "category = :cat",
  ExpressionAttributeValues: { ":cat": category }
}));
```

### TEST SPEC 2:
1. Create Lambda `witness-stage2-matching` in AWS console
2. Set env var: CODES_TABLE = "HousingCodes"
3. Attach IAM policy: DynamoDB read + Bedrock invoke
4. Test with hardcoded Stage 1 output:
```json
{
  "observations": [
    {
      "description": "Dark discoloration on ceiling surface, approximately 2 square feet",
      "category": "environmental",
      "confidence": "high"
    }
  ],
  "photoKey": "uploads/test-mold.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```
5. Verify it returns violations with REAL code_display values from your DynamoDB table.

---

## SPEC 3 — STAGE 3: COMPLAINT GENERATION LAMBDA (12:00)

**Mode: Spec (+ Create New Spec)**

```
Build the Stage 3 Complaint Generation Lambda function.

File: src/backend/lambdas/stage3-complaint.ts

Follow api-reference.md steering file for ALL AWS SDK patterns.

## What this Lambda does:
Receives verified violations from Stage 2, looks up enforcement contacts, and generates a formal complaint letter using Bedrock.

## Input (from Step Functions — Stage 2 output):
{
  "violations": [...],
  "photoKey": "uploads/1234-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}

## Processing steps:

1. Extract violations, photoKey, address, jurisdiction from event directly

2. Query DynamoDB table (env var CONTACTS_TABLE = "EnforcementContacts"):
   - Partition key: jurisdiction
   - Get ALL contacts for this jurisdiction (code_inspector, building_department, etc.)

3. Also query jurisdiction = "virginia_state" for the state escalation contact

4. Get current date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

5. Send violations + contacts + address + date to Bedrock with this prompt:

"You are a tenant rights documentation assistant for the state of Virginia. Generate a formal complaint letter to the local code enforcement office.

## Property Information
Address: {address}
Date of Documentation: {currentDate}
Jurisdiction: {jurisdiction}

## Violations Identified
{JSON.stringify(violations, null, 2)}

## Local Enforcement Contacts
{JSON.stringify(contacts, null, 2)}

Write a professional, firm complaint letter that:
1. Is addressed to the appropriate code enforcement office (use the contact info provided)
2. States the specific code sections being violated using the EXACT code_display values
3. Describes the observed conditions clearly and factually
4. References that photographic evidence with timestamps is available
5. Requests a formal inspection of the property
6. Uses a professional, assertive but respectful tone
7. Is written from the perspective of 'the tenant at [address]'
8. Ends with this exact disclaimer: 'This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance.'

Also provide a 1-2 sentence summary of the key violations found.

Respond ONLY with valid JSON:
{
  \"letter\": \"Dear [Office Name],\\n\\nI am writing to formally report...\\n\\n...\",
  \"summary\": \"X potential violations identified including...\"
}"

6. Parse the response

7. Build the complete Stage3Output:
{
  violations: violations,
  letter: parsed.letter,
  summary: parsed.summary,
  evidenceLog: {
    timestamp: new Date().toISOString(),
    address: address,
    photoKey: photoKey,
    jurisdiction: jurisdiction
  },
  contacts: allContacts
}

8. Return the complete output

## Error handling:
- If DynamoDB fails: still generate letter but note "Contact your local code enforcement office"
- If Bedrock fails: return violations and contacts without a letter, set letter to a template fallback
- If JSON parse fails: extract letter text with regex

## SDK patterns:
- Same DynamoDB pattern as Stage 2
- Import callBedrock from "../utils/bedrock-client"
- Import types from "../../shared/types"
- Do NOT parse event.body
```

### TEST SPEC 3:
Test with hardcoded input containing 1-2 violations. Verify the letter cites actual code sections and includes the disclaimer.

---

## SPEC 4 — GET-UPLOAD-URL LAMBDA (1:00)

**Mode: Vibe (this is simple, no full spec needed)**

```
Build the get-upload-url Lambda at src/backend/lambdas/get-upload-url.ts.

Follow api-reference.md for S3 pre-signed URL patterns.

This Lambda is called by API Gateway (NOT Step Functions), so it DOES parse event.body and DOES return CORS headers.

Steps:
1. Parse event.body (or use empty object if no body)
2. Generate a unique S3 key: `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`
3. Create a pre-signed PUT URL using @aws-sdk/s3-request-presigner with getSignedUrl
   - Bucket: process.env.PHOTOS_BUCKET
   - ContentType: "image/jpeg"
   - Expires in 300 seconds (5 minutes)
4. Return { statusCode: 200, headers: { CORS headers }, body: JSON.stringify({ uploadUrl, photoKey }) }

CORS headers on every response:
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "Content-Type",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Content-Type": "application/json"

Also handle OPTIONS requests for CORS preflight — return 200 with just the CORS headers.

Import crypto with: import { randomUUID } from "crypto";
```

---

## SPEC 5 — STEP FUNCTIONS + ORCHESTRATOR (1:30)

**Mode: Spec (+ Create New Spec)**

```
Build the Step Functions state machine definition and the Orchestrator Lambda.

## Part 1: State Machine Definition
File: infra/step-functions-definition.json

Create an AWS Step Functions Express Workflow definition that chains three Lambda functions in sequence:

{
  "Comment": "Witness AI Pipeline - 3-stage housing violation analysis",
  "StartAt": "Stage1VisionAnalysis",
  "States": {
    "Stage1VisionAnalysis": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:witness-stage1-vision",
      "Next": "Stage2CodeMatching",
      "TimeoutSeconds": 120,
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "MaxAttempts": 1,
          "IntervalSeconds": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "PipelineError",
          "ResultPath": "$.error"
        }
      ]
    },
    "Stage2CodeMatching": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:witness-stage2-matching",
      "Next": "Stage3ComplaintGeneration",
      "TimeoutSeconds": 120,
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "MaxAttempts": 1,
          "IntervalSeconds": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "PipelineError",
          "ResultPath": "$.error"
        }
      ]
    },
    "Stage3ComplaintGeneration": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:witness-stage3-complaint",
      "End": true,
      "TimeoutSeconds": 120,
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "MaxAttempts": 1,
          "IntervalSeconds": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "PipelineError",
          "ResultPath": "$.error"
        }
      ]
    },
    "PipelineError": {
      "Type": "Pass",
      "Result": {
        "error": "Pipeline failed. Please try again."
      },
      "End": true
    }
  }
}

NOTE: Replace ACCOUNT_ID with the actual AWS account ID. I will do this manually in the console.

## Part 2: Orchestrator Lambda
File: src/backend/lambdas/orchestrator.ts

This Lambda IS called by API Gateway, so it DOES parse event.body and DOES return CORS headers.

Steps:
1. Handle OPTIONS requests (return 200 with CORS headers)
2. Parse event.body to get { photoKey, address, jurisdiction }
3. Validate: if any field is missing, return 400 with error message
4. Call Step Functions using StartSyncExecutionCommand from @aws-sdk/client-sfn
   - stateMachineArn from process.env.STATE_MACHINE_ARN
   - input: JSON.stringify({ photoKey, address, jurisdiction })
5. Parse the execution output: JSON.parse(execution.output || "{}")
6. If execution.status !== "SUCCEEDED", return 500 with error
7. Return 200 with CORS headers and the pipeline output as the body

CORS headers on every response:
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "Content-Type",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Content-Type": "application/json"

## SDK patterns:
import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";
const sfn = new SFNClient({ region: "us-east-1" });

## Environment variables:
STATE_MACHINE_ARN: the ARN of the Express Workflow state machine
```

### HOW TO CREATE STEP FUNCTIONS IN CONSOLE:
1. AWS Console → Step Functions → Create State Machine
2. Choose "Write workflow in code" (not visual editor for speed)
3. Type: Express
4. Paste the JSON definition from infra/step-functions-definition.json
5. Replace ACCOUNT_ID with your actual account ID
6. Give it IAM permissions to invoke all 3 Lambda functions
7. Copy the State Machine ARN → set it as orchestrator Lambda's env var

---

## SPEC 6 — API GATEWAY (2:00)

**Mode: Vibe (do this in AWS Console, not code)**

This is done in the AWS Console, not in Kiro:

1. AWS Console → API Gateway → Create API → HTTP API
2. Add integration: POST /get-upload-url → witness-get-upload-url Lambda
3. Add integration: POST /analyze → witness-orchestrator Lambda
4. Configure CORS:
   - Allow Origins: *
   - Allow Methods: POST, OPTIONS
   - Allow Headers: Content-Type
5. Deploy → auto stage
6. Copy the invoke URL (looks like: https://abc123.execute-api.us-east-1.amazonaws.com)
7. **SHARE THIS URL WITH YOUR FRONTEND TEAMMATE IMMEDIATELY**

Test with curl:
```bash
# Test upload URL endpoint
curl -X POST https://YOUR-API-URL/get-upload-url

# Test analyze endpoint (after uploading a photo)
curl -X POST https://YOUR-API-URL/analyze \
  -H "Content-Type: application/json" \
  -d '{"photoKey":"uploads/test-mold.jpg","address":"123 Turner St","jurisdiction":"blacksburg"}'
```

---

## SPEC 7 — SEED SCRIPT (if Person C hasn't done it)

**Mode: Vibe**

```
Create a DynamoDB seed script at scripts/seed-dynamodb.ts that:

1. Reads data/housing-codes.json and data/enforcement-contacts.json
2. Uses BatchWriteCommand to write all items to their respective tables
3. HousingCodes table: partition key "category", sort key "code_section"
4. EnforcementContacts table: partition key "jurisdiction", sort key "contact_type"
5. Handles the 25-item BatchWrite limit by chunking
6. Logs progress: "Seeded X items to HousingCodes, Y items to EnforcementContacts"

Use DynamoDBDocumentClient from @aws-sdk/lib-dynamodb. Region us-east-1.
Run with: npx tsx scripts/seed-dynamodb.ts
```

---

## FALLBACK PLAN: IF STEP FUNCTIONS IS TOO SLOW TO SET UP

If by 1:30 PM Step Functions isn't working, switch to **Approach A** — one Lambda does everything:

**Vibe mode prompt:**
```
Combine stage1-vision.ts, stage2-matching.ts, and stage3-complaint.ts into a single Lambda at src/backend/lambdas/analyze-all.ts.

This Lambda:
1. Is called by API Gateway (parse event.body, return CORS headers)
2. Receives { photoKey, address, jurisdiction }
3. Runs Stage 1 (get photo from S3, call Bedrock vision)
4. Runs Stage 2 (query DynamoDB, call Bedrock matching, verify citations)
5. Runs Stage 3 (query contacts, call Bedrock complaint gen)
6. Returns the complete Stage3Output
7. All in sequence, in one function
8. Timeout: 300 seconds (5 min), Memory: 1024MB

Use the same helpers and patterns from the individual stage files.
This is the backup if Step Functions doesn't work in time.
```

---

## VIBE MODE QUICK-FIX TEMPLATES

Copy-paste these when things break:

**CORS not working:**
```
The /analyze endpoint is returning CORS errors. Fix the orchestrator Lambda at #src/backend/lambdas/orchestrator.ts to:
1. Handle OPTIONS method requests by returning 200 with CORS headers
2. Include these CORS headers on EVERY response including errors:
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Headers: Content-Type
   Access-Control-Allow-Methods: POST, OPTIONS
```

**Bedrock response parsing fails:**
```
The Bedrock response parsing is breaking in #src/backend/lambdas/stage1-vision.ts.
The current parsing is wrong. Fix it to use EXACTLY:
const result = JSON.parse(new TextDecoder().decode(response.body));
const textContent = result.content[0].text;
const parsed = JSON.parse(textContent);

Also add a try/catch around the JSON.parse(textContent) — if the AI returns non-JSON, try extracting JSON with a regex: const match = textContent.match(/\{[\s\S]*\}/); if (match) parsed = JSON.parse(match[0]);
```

**DynamoDB returns empty:**
```
The DynamoDB query in #src/backend/lambdas/stage2-matching.ts returns empty results.
Debug: log the category being queried and the table name.
Make sure:
1. Table name matches env var CODES_TABLE exactly
2. The category values in the query match the category values in the table items exactly (case-sensitive)
3. Using QueryCommand not GetCommand
4. KeyConditionExpression uses "category = :cat" not "#category = :cat"
```

**Lambda timeout:**
```
The Lambda is timing out. In #src/backend/lambdas/stage1-vision.ts:
1. Add console.log timestamps before and after each major operation (S3 get, base64 convert, Bedrock call)
2. Make sure the Lambda timeout is set to 90 seconds in the console
3. Make sure memory is 512MB
4. Check if the S3 photo is larger than 5MB — if so, the base64 will be huge and slow Bedrock down
```

---

## IAM PERMISSIONS CHEAT SHEET

Each Lambda needs these IAM policies attached to its execution role:

| Lambda | Needs |
|---|---|
| stage1-vision | S3:GetObject on photos bucket + bedrock:InvokeModel |
| stage2-matching | dynamodb:Query on HousingCodes table + bedrock:InvokeModel |
| stage3-complaint | dynamodb:Query on EnforcementContacts table + bedrock:InvokeModel |
| get-upload-url | S3:PutObject on photos bucket |
| orchestrator | states:StartSyncExecution on the state machine |
| Step Functions role | lambda:InvokeFunction on all 3 stage Lambdas |

Quick inline policy for Bedrock access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
    }
  ]
}
```

---

**Execute in order. Test between each spec. Don't stack specs without testing. You're the architect — Kiro is the builder.**
