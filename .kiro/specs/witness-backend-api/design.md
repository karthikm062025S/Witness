# Design Document: WITNESS Backend API

## Overview

The WITNESS backend API is a serverless AWS infrastructure that powers a housing code violation detection system for Virginia tenants. The system implements a 3-stage AI pipeline that analyzes photos of housing violations, matches observations to Virginia building codes with anti-hallucination verification, and generates formal complaint letters with enforcement contact information.

### Core Capabilities

- **Photo Upload**: Secure S3 pre-signed URL generation for direct client-to-S3 uploads
- **Vision Analysis**: Amazon Bedrock Claude 3.5 Haiku with vision capability to identify observable housing conditions
- **Code Matching**: DynamoDB-backed code lookup with AI matching and citation verification to prevent hallucinated references
- **Complaint Generation**: Formal letter generation with jurisdiction-specific enforcement contacts
- **Orchestration**: AWS Step Functions Express Workflow for synchronous pipeline execution

### Key Design Principles

1. **Anti-Hallucination**: Every AI-generated code citation is verified against DynamoDB query results before being returned to users
2. **Separation of Concerns**: Clear boundaries between API Gateway Lambdas (parse event.body, return CORS) and Step Functions Lambdas (direct input, no CORS)
3. **Hackathon-Ready**: Prioritize reliability and demo quality over feature completeness
4. **Type Safety**: Comprehensive TypeScript interfaces for all data structures
5. **Observable Facts**: Stage 1 focuses on what is visibly present in photos, not diagnoses or legal conclusions

## Architecture

### High-Level System Diagram

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │
       │ POST /get-upload-url
       ▼
┌─────────────────────────────────────────┐
│         API Gateway (HTTP API)          │
│  ┌──────────────┐   ┌────────────────┐ │
│  │/get-upload-  │   │   /analyze     │ │
│  │    url       │   │                │ │
│  └──────┬───────┘   └────────┬───────┘ │
└─────────┼──────────────────────┼─────────┘
          │                      │
          ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ get-upload-url   │   │  orchestrator    │
│    Lambda        │   │     Lambda       │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         │                      │ StartSyncExecution
         ▼                      ▼
    ┌────────┐        ┌─────────────────────┐
    │   S3   │        │  Step Functions     │
    │ Bucket │        │ (Express Workflow)  │
    └────────┘        └──────────┬──────────┘
                                 │
                      ┌──────────┴──────────┐
                      │                     │
                      ▼                     ▼
            ┌──────────────────┐  ┌──────────────────┐
            │  stage1-vision   │  │   DynamoDB       │
            │     Lambda       │  │  - HousingCodes  │
            └────────┬─────────┘  │  - Enforcement   │
                     │            │    Contacts      │
                     ▼            └──────────────────┘
            ┌──────────────────┐
            │ stage2-matching  │
            │     Lambda       │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │stage3-complaint  │
            │     Lambda       │
            └────────┬─────────┘
                     │
                     ▼
              ┌──────────┐
              │  Result  │
              └──────────┘
```

### Pipeline Sequence Diagram

```
Client          API GW      Orchestrator    Step Functions    Stage1    S3    Stage2    DynamoDB    Stage3    Bedrock
  │                │              │                │             │       │       │          │          │         │
  │─POST /analyze─>│              │                │             │       │       │          │          │         │
  │                │──invoke────>│                │             │       │       │          │          │         │
  │                │              │─StartSync────>│             │       │       │          │          │         │
  │                │              │                │──invoke───>│       │       │          │          │         │
  │                │              │                │             │─get──>│       │          │          │         │
  │                │              │                │             │<──────│       │          │          │         │
  │                │              │                │             │─vision────────────────────────────>│         │
  │                │              │                │             │<──────────────────────────────────│         │
  │                │              │                │<────────────│       │       │          │          │         │
  │                │              │                │──invoke───────────>│       │          │          │         │
  │                │              │                │             │       │       │─query───>│          │         │
  │                │              │                │             │       │       │<─────────│          │         │
  │                │              │                │             │       │       │─match────────────────────────>│
  │                │              │                │             │       │       │<──────────────────────────────│
  │                │              │                │             │       │       │ (verify citations)   │         │
  │                │              │                │<────────────────────│       │          │          │         │
  │                │              │                │──invoke─────────────────────────────>│          │         │
  │                │              │                │             │       │       │          │─query───>│         │
  │                │              │                │             │       │       │          │<─────────│         │
  │                │              │                │             │       │       │          │─generate─────────>│
  │                │              │                │             │       │       │          │<─────────────────│
  │                │              │                │<────────────────────────────────────│          │         │
  │                │              │<───result──────│             │       │       │          │          │         │
  │                │<─────────────│                │             │       │       │          │          │         │
  │<───response────│              │                │             │       │       │          │          │         │
```

### AWS Service Integration

**S3 (Photo Storage)**
- Bucket: `witness-photos-hackathon`
- Pre-signed URLs with 5-minute expiration
- Direct client upload (bypasses Lambda payload limits)
- Lambda read access via IAM role

**DynamoDB (Reference Data)**
- `HousingCodes` table: 22 Virginia code entries
  - Partition key: `category` (structural, electrical, plumbing, environmental, fire_safety, pest, heating)
  - Sort key: `code_section`
- `EnforcementContacts` table: Jurisdiction-specific filing contacts
  - Partition key: `jurisdiction` (blacksburg, montgomery_county, virginia)
  - Sort key: `contact_type`

**Bedrock (AI Processing)**
- Model: `anthropic.claude-3-5-haiku-20241022-v1:0`
- Stage 1: Vision analysis with image input
- Stage 2: Text-only code matching
- Stage 3: Text-only complaint generation
- Max tokens: 4096 per request

**Step Functions (Orchestration)**
- Type: Express Workflow (synchronous execution)
- Enables visual monitoring in AWS Console
- Automatic retry logic per stage
- Clear error isolation

**API Gateway (HTTP API)**
- Routes: `/get-upload-url`, `/analyze`
- CORS: Allow-Origin `*` (hackathon scope)
- JSON request/response format

## Components and Interfaces

### Lambda Functions

#### 1. get-upload-url.ts

**Purpose**: Generate pre-signed S3 URLs for photo uploads

**Type**: API Gateway Lambda

**Handler Pattern**:
```typescript
export const handler = async (event: any) => {
  const body = JSON.parse(event.body || "{}");
  
  // Generate pre-signed URL
  const photoKey = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.PHOTOS_BUCKET,
    Key: photoKey,
    ContentType: "image/jpeg"
  }), { expiresIn: 300 });
  
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ uploadUrl, photoKey })
  };
};
```

**Environment Variables**:
- `PHOTOS_BUCKET`: S3 bucket name

**IAM Permissions**:
- `s3:PutObject` on photos bucket

**Error Handling**:
- S3 client failures → 500 with error message

#### 2. orchestrator.ts

**Purpose**: Receive API requests and trigger Step Functions workflow

**Type**: API Gateway Lambda

**Handler Pattern**:
```typescript
export const handler = async (event: any) => {
  const { photoKey, address, jurisdiction } = JSON.parse(event.body || "{}");
  
  // Validate input
  if (!photoKey || !address || !jurisdiction) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing required fields" }) };
  }
  
  // Start Step Functions execution
  const execution = await sfn.send(new StartSyncExecutionCommand({
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify({ photoKey, address, jurisdiction })
  }));
  
  const output = JSON.parse(execution.output || "{}");
  
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(output)
  };
};
```

**Environment Variables**:
- `STATE_MACHINE_ARN`: Step Functions ARN

**IAM Permissions**:
- `states:StartSyncExecution` on state machine

**Error Handling**:
- Missing fields → 400 with validation error
- Step Functions failures → 500 with error context

#### 3. stage1-vision.ts

**Purpose**: Analyze photos using Bedrock vision to identify observable housing conditions

**Type**: Step Functions Lambda

**Handler Pattern**:
```typescript
export const handler = async (event: Stage1Input): Promise<Stage1Output> => {
  const { photoKey, address, jurisdiction } = event;
  
  // 1. Retrieve photo from S3
  const obj = await s3.send(new GetObjectCommand({
    Bucket: process.env.PHOTOS_BUCKET,
    Key: photoKey
  }));
  
  // 2. Convert to base64
  const chunks: Uint8Array[] = [];
  for await (const chunk of obj.Body as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const base64 = buffer.toString("base64");
  
  // 3. Call Bedrock with vision
  const observations = await callBedrockWithImage(base64, STAGE1_PROMPT);
  
  // 4. Return observations with context
  return {
    observations,
    photoKey,
    address,
    jurisdiction
  };
};
```

**Environment Variables**:
- `PHOTOS_BUCKET`: S3 bucket name

**IAM Permissions**:
- `s3:GetObject` on photos bucket
- `bedrock:InvokeModel`

**Error Handling**:
- S3 GetObject failure → throw error with photoKey
- Bedrock failure → throw error with context
- JSON parsing failure → throw error with raw response

#### 4. stage2-matching.ts

**Purpose**: Match observations to Virginia codes with citation verification (anti-hallucination)

**Type**: Step Functions Lambda

**Handler Pattern**:
```typescript
export const handler = async (event: Stage2Input): Promise<Stage2Output> => {
  const { observations, photoKey, address, jurisdiction } = event;
  
  // 1. Extract unique categories from observations
  const categories = [...new Set(observations.map(o => o.category))];
  
  // 2. Query DynamoDB for relevant codes
  const codeEntries = [];
  for (const category of categories) {
    const result = await dynamodb.send(new QueryCommand({
      TableName: process.env.CODES_TABLE,
      KeyConditionExpression: "category = :cat",
      ExpressionAttributeValues: { ":cat": category }
    }));
    codeEntries.push(...(result.Items || []));
  }
  
  // 3. Call Bedrock for code matching
  const aiViolations = await callBedrock(STAGE2_PROMPT, { observations, codeEntries });
  
  // 4. CRITICAL: Verify citations against database results
  const verifiedViolations = aiViolations.filter(violation => {
    return codeEntries.some(entry => entry.code_display === violation.code_display);
  });
  
  // 5. Return verified violations with observations passed through
  return {
    violations: verifiedViolations,
    observations,  // Pass through from Stage 1
    photoKey,
    address,
    jurisdiction
  };
};
```

**Environment Variables**:
- `CODES_TABLE`: HousingCodes table name

**IAM Permissions**:
- `dynamodb:Query` on HousingCodes table
- `bedrock:InvokeModel`

**Error Handling**:
- DynamoDB query failure → throw error
- Empty code entries → continue with empty array
- All citations filtered out → return empty violations array

**Key Design Decision**: The citation verification step (step 4) is the critical anti-hallucination mechanism. Any code citation generated by the AI that doesn't exist in the DynamoDB query results is filtered out. This prevents the system from citing non-existent code sections.

#### 5. stage3-complaint.ts

**Purpose**: Generate formal complaint letter with enforcement contacts

**Type**: Step Functions Lambda

**Handler Pattern**:
```typescript
export const handler = async (event: Stage3Input): Promise<Stage3Output> => {
  const { violations, observations, photoKey, address, jurisdiction } = event;
  
  // 1. Query enforcement contacts
  const result = await dynamodb.send(new QueryCommand({
    TableName: process.env.CONTACTS_TABLE,
    KeyConditionExpression: "jurisdiction = :jur",
    ExpressionAttributeValues: { ":jur": jurisdiction }
  }));
  const contacts = result.Items || [];
  
  // 2. Generate complaint letter
  const result = await callBedrock(STAGE3_PROMPT, {
    violations,
    address,
    current_date: new Date().toISOString(),
    jurisdiction,
    contacts
  });
  
  // 3. Extract letter from result
  const complaintLetter = result.letter;
  
  // 4. Construct complete output
  return {
    observations: observations || [],
    violations,
    complaint_letter: complaintLetter,
    evidence_log: {
      timestamp: new Date().toISOString(),
      location: address,
      photo_reference: photoKey
    },
    contacts
  };
};
```

**Environment Variables**:
- `CONTACTS_TABLE`: EnforcementContacts table name

**IAM Permissions**:
- `dynamodb:Query` on EnforcementContacts table
- `bedrock:InvokeModel`

**Error Handling**:
- Empty contacts → use default Virginia DHCD contact
- Empty violations → generate letter stating no violations identified
- Bedrock failure → throw error with context

### Utility Modules

#### bedrock-client.ts

**Purpose**: Reusable Bedrock wrapper for text and vision requests

**Interface**:
```typescript
export async function callBedrock(prompt: string, context: any): Promise<any>;
export async function callBedrockWithImage(imageBase64: string, prompt: string): Promise<any>;
```

**Implementation Details**:
- Uses `@aws-sdk/client-bedrock-runtime` (NOT `@aws-sdk/client-bedrock`)
- Includes `anthropic_version: "bedrock-2023-05-31"` in all requests
- Sets `max_tokens: 4096`
- Parses response: `JSON.parse(new TextDecoder().decode(response.body))`
- Extracts text: `result.content[0].text`
- For vision: formats image as `{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } }`
- Does NOT include `data:image/jpeg;base64,` prefix in image data

#### cors.ts

**Purpose**: CORS headers helper for API Gateway responses

**Interface**:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
```

### Step Functions State Machine

**Type**: Express Workflow (synchronous)

**Definition** (JSON):
```json
{
  "Comment": "WITNESS 3-stage AI pipeline",
  "StartAt": "Stage1Vision",
  "States": {
    "Stage1Vision": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:stage1-vision",
      "Next": "Stage2Matching"
    },
    "Stage2Matching": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:stage2-matching",
      "Next": "Stage3Complaint"
    },
    "Stage3Complaint": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:stage3-complaint",
      "End": true
    }
  }
}
```

**Error Handling**: Each stage can throw errors that propagate to the orchestrator. No automatic retries configured (hackathon scope).

## Data Models

### TypeScript Interfaces

```typescript
// Observation from Stage 1
export interface Observation {
  description: string;
  category: "structural" | "electrical" | "plumbing" | "environmental" | "fire_safety" | "pest" | "heating";
  confidence: "high" | "medium" | "low";
}

// Violation from Stage 2
export interface Violation {
  code_display: string;  // e.g., "VMC § 305.1"
  title: string;
  match_reasoning: string;
  plain_english: string;
  confidence: "high" | "medium" | "low";
  severity: "high" | "moderate" | "low";
  observation_ref: string;  // Reference to which observation triggered this violation
}

// Enforcement contact from DynamoDB
export interface EnforcementContact {
  jurisdiction: string;
  contact_type: string;
  display_name: string;
  method: string;
  phone?: string;
  website?: string;
  address?: string;
  hours?: string;
  notes?: string;
}

// Evidence log
export interface EvidenceLog {
  timestamp: string;  // ISO 8601
  location: string;   // Address
  photo_reference: string;  // S3 key
}

// Stage 1 Input
export interface Stage1Input {
  photoKey: string;
  address: string;
  jurisdiction: string;
}

// Stage 1 Output → Stage 2 Input
export interface Stage1Output {
  observations: Observation[];
  photoKey: string;
  address: string;
  jurisdiction: string;
}

// Stage 2 Input (same as Stage1Output)
export type Stage2Input = Stage1Output;

// Stage 2 Output → Stage 3 Input
export interface Stage2Output {
  violations: Violation[];
  observations: Observation[];  // Pass through from Stage 1
  photoKey: string;
  address: string;
  jurisdiction: string;
}

// Stage 3 Input (extends Stage2Output)
export interface Stage3Input extends Stage2Output {
  observations?: Observation[];  // Optional, passed through
}

// Stage 3 Output (Final API Response)
export interface Stage3Output {
  observations: Observation[];
  violations: Violation[];
  complaint_letter: string;
  evidence_log: EvidenceLog;
  contacts: EnforcementContact[];
}

// Housing code entry from DynamoDB
export interface HousingCodeEntry {
  category: string;
  code_section: string;
  code_display: string;
  title: string;
  requirement_text: string;
  plain_english: string;
  jurisdiction: string;
}
```

### DynamoDB Table Schemas

#### HousingCodes Table

**Keys**:
- Partition key: `category` (String)
- Sort key: `code_section` (String)

**Attributes**:
- `code_display` (String): Display format (e.g., "VMC § 305.1")
- `title` (String): Short title
- `requirement_text` (String): Full legal text
- `plain_english` (String): Simplified explanation
- `jurisdiction` (String): "virginia"

**Example Item**:
```json
{
  "category": "environmental",
  "code_section": "VMC_305_1",
  "code_display": "VMC § 305.1",
  "title": "Interior Condition — General",
  "requirement_text": "The interior of a structure and its equipment must be kept in good repair, structurally sound, and sanitary.",
  "plain_english": "The inside of the apartment has to be safe, maintained, and sanitary.",
  "jurisdiction": "virginia"
}
```

#### EnforcementContacts Table

**Keys**:
- Partition key: `jurisdiction` (String)
- Sort key: `contact_type` (String)

**Attributes**:
- `display_name` (String): Contact name
- `method` (String): "phone", "web", "in_person", "phone_web"
- `phone` (String, optional): Phone number
- `website` (String, optional): URL
- `address` (String, optional): Physical address
- `hours` (String, optional): Business hours
- `notes` (String, optional): Additional info

**Example Item**:
```json
{
  "jurisdiction": "blacksburg",
  "contact_type": "code_inspector",
  "display_name": "Blacksburg Code Inspector",
  "method": "phone",
  "phone": "(540) 443-1612",
  "hours": "Mon-Fri 8:00 AM - 5:00 PM"
}
```

### API Request/Response Schemas

#### POST /get-upload-url

**Request**:
```json
{}
```
(Empty body or optional metadata)

**Response** (200):
```json
{
  "uploadUrl": "https://witness-photos-hackathon.s3.amazonaws.com/uploads/1234567890-uuid.jpg?X-Amz-Algorithm=...",
  "photoKey": "uploads/1234567890-uuid.jpg"
}
```

**Error Response** (500):
```json
{
  "error": "Failed to generate upload URL",
  "details": "S3 client error message"
}
```

#### POST /analyze

**Request**:
```json
{
  "photoKey": "uploads/1234567890-uuid.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}
```

**Response** (200):
```json
{
  "observations": [
    {
      "description": "Dark discoloration and moisture staining visible on ceiling",
      "category": "environmental",
      "confidence": "high"
    }
  ],
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
  "complaint_letter": "Building Official,\nTown of Blacksburg Code Enforcement\n\n...",
  "evidence_log": {
    "timestamp": "2026-03-28T15:30:00.000Z",
    "location": "123 Turner St, Blacksburg, VA",
    "photo_reference": "uploads/1234567890-uuid.jpg"
  },
  "contacts": [
    {
      "jurisdiction": "blacksburg",
      "contact_type": "code_inspector",
      "display_name": "Blacksburg Code Inspector",
      "method": "phone",
      "phone": "(540) 443-1612"
    }
  ]
}
```

**Error Response** (400):
```json
{
  "error": "Missing required fields",
  "required": ["photoKey", "address", "jurisdiction"]
}
```

**Error Response** (500):
```json
{
  "error": "Pipeline execution failed",
  "stage": "stage1-vision",
  "details": "S3 GetObject failed for key: uploads/..."
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Pre-signed URL Generation

For any upload URL request, the generated pre-signed S3 URL should allow PUT operations and expire after 5 minutes (300 seconds).

**Validates: Requirements 1.1**

### Property 2: Upload Response Structure

For any upload URL request, the response should contain both `uploadUrl` and `photoKey` fields.

**Validates: Requirements 1.2**

### Property 3: CORS Headers Presence

For any API Gateway response (from `/get-upload-url` or `/analyze`), the response headers should include `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, `Access-Control-Allow-Methods`, and `Content-Type`.

**Validates: Requirements 1.3, 5.5, 12.3, 12.4, 12.5, 12.6**

### Property 4: Vision Output Structure

For any Stage 1 execution, the output should contain an `observations` array where each observation has `description`, `category`, and `confidence` fields.

**Validates: Requirements 2.3**

### Property 5: Valid Observation Categories and Confidence

For any Stage 1 output, all observations should have category values from the set {structural, electrical, plumbing, environmental, fire_safety, pest, heating} and confidence values from the set {high, medium, low}.

**Validates: Requirements 2.8, 2.9**

### Property 6: Code Matcher Database Query

For any set of observations with categories C, the Code_Matcher should query the HousingCodes_Table for all categories in C.

**Validates: Requirements 3.1**

### Property 7: Violation Output Structure

For any Stage 2 execution, the output should contain a `violations` array where each violation has `code_display`, `title`, `match_reasoning`, `plain_english`, `confidence`, and `severity` fields.

**Validates: Requirements 3.3, 3.9**

### Property 8: Citation Verification (Anti-Hallucination)

For any Stage 2 output, every violation's `code_display` value must exist in the DynamoDB query results from HousingCodes_Table. No violation should cite a code section that was not retrieved from the database.

**Validates: Requirements 3.4, 3.5, 10.4**

### Property 9: Enforcement Contacts Query

For any jurisdiction J, the Complaint_Generator should query the EnforcementContacts_Table for all contacts where jurisdiction equals J.

**Validates: Requirements 4.1**

### Property 10: Complaint Letter Presence

For any Stage 3 execution, the output should contain a non-empty `complaint_letter` field.

**Validates: Requirements 4.3**

### Property 11: Complete Stage 3 Output Structure

For any Stage 3 execution, the output should contain `observations`, `violations`, `complaint_letter`, `evidence_log`, and `contacts` fields, where `evidence_log` includes `timestamp`, `location`, and `photo_reference`.

**Validates: Requirements 4.4, 4.6**

### Property 12: Disclaimer Inclusion

For any generated complaint letter, the text should contain the disclaimer: "This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance."

**Validates: Requirements 4.8**

### Property 13: Workflow Invocation

For any valid analyze request with `photoKey`, `address`, and `jurisdiction`, the Orchestrator should invoke the Step Functions workflow with those exact parameters.

**Validates: Requirements 5.1**

### Property 14: Sequential Stage Execution

For any Step Functions workflow execution, Stage 1 (Vision_Analyzer) should complete before Stage 2 (Code_Matcher) starts, and Stage 2 should complete before Stage 3 (Complaint_Generator) starts.

**Validates: Requirements 5.2**

### Property 15: Stage Output Chaining

For any Step Functions workflow execution, the output of Stage N should be passed as the input to Stage N+1, preserving all fields from previous stages.

**Validates: Requirements 5.3**

### Property 16: Error Propagation

For any stage failure in the Step Functions workflow, the error should propagate to the Orchestrator without executing subsequent stages.

**Validates: Requirements 5.6, 11.1**

### Property 17: Final Output Return

For any successful workflow execution, the Orchestrator should return the Stage 3 output unchanged to the client.

**Validates: Requirements 5.7**

### Property 18: Bedrock Image Request Format

For any image input to callBedrockWithImage, the request body should contain a messages array with an image object formatted as `{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: <base64> } }`.

**Validates: Requirements 6.3**

### Property 19: Bedrock Response Parsing

For any successful Bedrock response, the Bedrock_Client should extract the text content from `result.content[0].text`.

**Validates: Requirements 6.5**

### Property 20: Bedrock Error Handling

For any Bedrock error response, the Bedrock_Client should throw an error containing the response details.

**Validates: Requirements 6.7**

### Property 21: Seed Script Completeness

For any execution of the seed script, all 22 Virginia code entries from housing-codes.json should be written to the HousingCodes_Table.

**Validates: Requirements 8.3**

### Property 22: Environment Variable Validation

For any Lambda initialization, if a required environment variable (PHOTOS_BUCKET, CODES_TABLE, CONTACTS_TABLE, STATE_MACHINE_ARN, MODEL_ID) is missing, the Lambda should throw an error before processing any requests.

**Validates: Requirements 9.7**

### Property 23: Citation Format Compliance

For any code citation in the system output, VMC sections should use the prefix "VMC §", Virginia Code sections should use "Va. Code §", and no citation should use "IPMC §".

**Validates: Requirements 10.1, 10.2, 10.3**

### Property 24: Citation Format Preservation

For any violation passed from Stage 2 to Stage 3, the `code_display` value should appear unchanged in the final output.

**Validates: Requirements 10.5**

### Property 25: Empty Code Match Handling

For any Stage 2 execution where no database codes match the observations, the output should contain an empty `violations` array.

**Validates: Requirements 11.2**

### Property 26: Citation Filter Completeness

For any Stage 2 execution where all AI-generated citations fail verification, the output should contain an empty `violations` array.

**Validates: Requirements 11.3**

### Property 27: Empty Violations Letter Generation

For any Stage 3 execution with an empty `violations` array, the generated complaint letter should state that no code violations were identified.

**Validates: Requirements 11.4**

### Property 28: Graceful Empty Query Handling

For any DynamoDB query that returns zero results, the system should continue execution with an empty array rather than throwing an error.

**Validates: Requirements 11.5**

### Property 29: HTTP Status Code Correctness

For any API request, successful executions should return status code 200, invalid payloads should return 400, and internal errors should return 500.

**Validates: Requirements 12.7, 12.8, 12.9**

## Error Handling

### Error Categories

**1. Input Validation Errors (400)**
- Missing required fields (photoKey, address, jurisdiction)
- Invalid JSON payload
- Malformed photo key format

**2. Resource Not Found Errors (404)**
- Photo key does not exist in S3
- Invalid jurisdiction (no contacts found)

**3. External Service Errors (500)**
- S3 GetObject failures
- DynamoDB query failures
- Bedrock InvokeModel failures
- Step Functions execution failures

**4. Data Quality Errors (500)**
- Bedrock returns invalid JSON
- Bedrock response missing expected fields
- Image conversion failures

### Error Response Format

All errors should return a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "stage": "stage1-vision | stage2-matching | stage3-complaint | orchestrator | get-upload-url",
  "details": "Technical details for debugging (optional)"
}
```

### Error Handling Strategies

**get-upload-url Lambda**:
- S3 client failure → Return 500 with error message
- Log error to CloudWatch with request context

**orchestrator Lambda**:
- Missing fields → Return 400 with validation error
- Step Functions failure → Return 500 with execution ARN
- Parse Step Functions error output if available

**stage1-vision Lambda**:
- S3 GetObject failure → Throw error with photoKey
- Image conversion failure → Throw error with details
- Bedrock failure → Throw error with model ID and prompt length
- Invalid JSON response → Attempt regex extraction, fallback to error

**stage2-matching Lambda**:
- DynamoDB query failure → Throw error with table name and category
- Empty query results → Continue with empty array (not an error)
- Bedrock failure → Throw error with context
- All citations filtered → Return empty violations array (not an error)

**stage3-complaint Lambda**:
- DynamoDB query failure → Log warning, use default Virginia DHCD contact
- Empty contacts → Use default contact (not an error)
- Empty violations → Generate "no violations" letter (not an error)
- Bedrock failure → Throw error with context

### Logging Strategy

**CloudWatch Logs Structure**:
- All Lambdas log to `/aws/lambda/<function-name>`
- Log level: INFO for normal operations, ERROR for failures
- Include request ID in all log entries
- Log execution duration for performance monitoring

**What to Log**:
- Lambda invocation start/end
- External service calls (S3, DynamoDB, Bedrock) with timing
- Errors with full stack traces
- Citation verification results (how many filtered)
- Step Functions execution ARN

**What NOT to Log**:
- Photo image data (base64 strings)
- Full Bedrock responses (too large)
- PII from addresses (hackathon scope allows this, but note for production)

### Retry Strategy

**Hackathon Scope**: No automatic retries configured

**Production Considerations**:
- Bedrock throttling → Exponential backoff with jitter
- DynamoDB throttling → SDK built-in retries
- S3 transient failures → SDK built-in retries
- Step Functions → Configure retry policies per stage

## Testing Strategy

### Dual Testing Approach

The WITNESS backend API requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing Configuration

**Library Selection**:
- **JavaScript/TypeScript**: Use `fast-check` library
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property

**Tag Format**:
```typescript
// Feature: witness-backend-api, Property 8: Citation Verification (Anti-Hallucination)
test('all violations cite codes from database', () => {
  fc.assert(fc.property(
    observationsArbitrary,
    dbCodesArbitrary,
    (observations, dbCodes) => {
      const violations = stage2Matching(observations, dbCodes);
      return violations.every(v => 
        dbCodes.some(code => code.code_display === v.code_display)
      );
    }
  ), { numRuns: 100 });
});
```

### Unit Testing Focus Areas

**get-upload-url Lambda**:
- Pre-signed URL contains correct bucket and key
- URL expires after 15 minutes
- Response includes both uploadUrl and photoKey
- CORS headers are present
- S3 client errors return 500

**orchestrator Lambda**:
- Missing photoKey returns 400
- Missing address returns 400
- Missing jurisdiction returns 400
- Step Functions invocation includes all input fields
- Step Functions errors propagate to response
- CORS headers are present

**stage1-vision Lambda**:
- S3 GetObject retrieves correct photo
- Image converts to base64 correctly
- Bedrock request includes image and prompt
- Response parses into observations array
- All observations have valid categories
- All observations have valid confidence levels
- S3 errors throw with photoKey
- Bedrock errors throw with context

**stage2-matching Lambda**:
- DynamoDB queries for all observation categories
- Bedrock receives observations and code entries
- Response parses into violations array
- Citation verification filters invalid codes
- All violations have required fields
- Empty database results return empty violations
- All citations filtered returns empty violations

**stage3-complaint Lambda**:
- DynamoDB queries for jurisdiction contacts
- Bedrock receives violations and property info
- Response includes complaint letter
- Output has all required fields (observations, violations, letter, evidence_log, contacts)
- Evidence log has timestamp, location, photo_reference
- Disclaimer appears in complaint letter
- Empty violations generates "no violations" letter
- Empty contacts uses default contact

**bedrock-client Utility**:
- callBedrock formats text-only requests correctly
- callBedrockWithImage formats image requests correctly
- Image data is base64 without data URI prefix
- Response parsing extracts content[0].text
- JSON parsing handles valid responses
- Bedrock errors throw with details

**cors Utility**:
- Headers include Access-Control-Allow-Origin: *
- Headers include Access-Control-Allow-Headers: Content-Type
- Headers include Access-Control-Allow-Methods: POST, OPTIONS
- Headers include Content-Type: application/json

### Property-Based Testing Focus Areas

**Property 1-3**: Upload URL generation and response structure
- Generate random requests
- Verify URL format and expiration
- Verify response structure
- Verify CORS headers

**Property 4-5**: Vision output structure and valid values
- Generate random photo keys
- Verify observations array structure
- Verify all categories are valid
- Verify all confidence levels are valid

**Property 6-8**: Code matching and citation verification
- Generate random observations with various categories
- Generate random database code entries
- Verify database queries for all categories
- Verify all output citations exist in database (CRITICAL)
- Verify violation structure

**Property 9-12**: Complaint generation and output structure
- Generate random violations and jurisdictions
- Verify database queries for jurisdiction
- Verify complete output structure
- Verify disclaimer presence in all letters

**Property 13-17**: Workflow orchestration and data flow
- Generate random valid inputs
- Verify workflow invocation
- Verify stage execution order
- Verify data flows between stages
- Verify error propagation

**Property 18-20**: Bedrock client behavior
- Generate random images and prompts
- Verify request format
- Verify response parsing
- Verify error handling

**Property 21-29**: System-wide properties
- Verify seed script completeness
- Verify environment variable validation
- Verify citation format compliance
- Verify error handling across all stages
- Verify HTTP status codes

### Integration Testing

**End-to-End Flow**:
1. Generate upload URL
2. Upload test photo to S3
3. Call analyze endpoint
4. Verify complete pipeline execution
5. Verify final output structure
6. Verify all citations are valid

**Test Photos**:
- Use all 5 demo photos from `demo-photos/` directory
- Verify each produces reasonable observations
- Verify citations match expected categories
- Verify complaint letters are well-formed

**Database Integration**:
- Seed test DynamoDB tables
- Verify queries return expected results
- Test with missing data (empty tables)
- Test with partial data (some categories missing)

**Bedrock Integration**:
- Test with real Bedrock API
- Verify vision analysis produces observations
- Verify code matching produces violations
- Verify complaint generation produces letters
- Test error handling for invalid model IDs

### Performance Testing

**Hackathon Scope**: Basic performance validation only

**Metrics to Monitor**:
- End-to-end pipeline duration (target: < 20 seconds)
- Individual stage durations
- Bedrock API latency
- DynamoDB query latency
- S3 GetObject latency

**Load Testing**: Not required for hackathon demo

### Security Testing

**Input Validation**:
- Test with missing required fields
- Test with malformed JSON
- Test with invalid photo keys
- Test with SQL injection attempts in address field
- Test with XSS attempts in address field

**File Upload**:
- Test with oversized files (> 10MB)
- Test with invalid file types
- Test with malicious file content

**CORS**:
- Verify CORS headers allow cross-origin requests
- Test OPTIONS preflight requests

**Environment Variables**:
- Test with missing environment variables
- Verify Lambda fails to initialize

### Test Data

**Mock Observations**:
```typescript
const mockObservations: Observation[] = [
  {
    description: "Dark discoloration on ceiling",
    category: "environmental",
    confidence: "high"
  },
  {
    description: "Exposed electrical wiring",
    category: "electrical",
    confidence: "high"
  }
];
```

**Mock Code Entries**:
```typescript
const mockCodeEntries: HousingCodeEntry[] = [
  {
    category: "environmental",
    code_section: "VMC_305_1",
    code_display: "VMC § 305.1",
    title: "Interior Condition — General",
    requirement_text: "The interior of a structure...",
    plain_english: "The inside of the apartment...",
    jurisdiction: "virginia"
  }
];
```

**Mock Violations**:
```typescript
const mockViolations: Violation[] = [
  {
    code_display: "VMC § 305.1",
    title: "Interior Condition — General",
    match_reasoning: "Visible ceiling damage",
    plain_english: "Interior must be maintained",
    confidence: "high",
    severity: "moderate"
  }
];
```

### Continuous Integration

**Hackathon Scope**: Manual testing sufficient

**Production Considerations**:
- Run unit tests on every commit
- Run property tests on every PR
- Run integration tests before deployment
- Monitor test coverage (target: > 80%)
- Fail builds on test failures

