# Exact API References — No Assumptions
# Kiro MUST follow these exact patterns. Do NOT deviate.

## Bedrock Model ID (EXACT — do not change)
anthropic.claude-haiku-4-5-20251001-v1:0

NOTE: This is Claude Haiku 4.5 - the latest version with near-frontier 
performance, excellent coding capabilities, and vision support. Released 
October 15, 2025. If this model ID does not work, check the Bedrock 
console for the exact model ID.

## Bedrock SDK Imports (EXACT)
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
// Do NOT use @aws-sdk/client-bedrock — that's for model management, not inference
```

## Bedrock Request Format (EXACT)
```typescript
const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

const response = await bedrock.send(new InvokeModelCommand({
  modelId: "anthropic.claude-haiku-4-5-20251001-v1:0",
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: photoBase64String
          }
        },
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
const parsed = JSON.parse(textContent);
```

## DynamoDB SDK Imports (EXACT)
```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const dynamodb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" })
);
```

## DynamoDB Query Pattern (EXACT)
```typescript
const result = await dynamodb.send(new QueryCommand({
  TableName: process.env.CODES_TABLE,
  KeyConditionExpression: "category = :cat",
  ExpressionAttributeValues: { ":cat": categoryValue }
}));
const items = result.Items || [];
```

## S3 Pre-signed URL Pattern (EXACT)
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3 = new S3Client({ region: "us-east-1" });
const key = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;

const uploadUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({
    Bucket: process.env.PHOTOS_BUCKET,
    Key: key,
    ContentType: "image/jpeg"
  }),
  { expiresIn: 300 }
);
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

// For Step Functions direct invocation:
export const handler = async (event: any) => {
  const { photoKey, observations, violations, address, jurisdiction } = event;
  return result;
};
```

## Environment Variables
- PHOTOS_BUCKET: S3 bucket name for photos
- CODES_TABLE: HousingCodes
- CONTACTS_TABLE: EnforcementContacts
- STATE_MACHINE_ARN: Step Functions ARN

## NPM Packages Needed (backend)
```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.1019.0",
    "@aws-sdk/client-dynamodb": "^3.1019.0",
    "@aws-sdk/lib-dynamodb": "^3.1019.0",
    "@aws-sdk/client-s3": "^3.1019.0",
    "@aws-sdk/s3-request-presigner": "^3.1019.0",
    "@aws-sdk/client-sfn": "^3.1019.0"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "@types/node": "^22.0.0",
    "@types/aws-lambda": "^8.10.145",
    "esbuild": "^0.24.0",
    "fast-check": "^3.22.0"
  }
}
```

## CRITICAL: Common Kiro Mistakes to Prevent
1. Do NOT use `@aws-sdk/client-bedrock` — use `@aws-sdk/client-bedrock-runtime`
2. Do NOT use `InvokeModel` — use `InvokeModelCommand`
3. Do NOT forget `anthropic_version: "bedrock-2023-05-31"`
4. Do NOT parse `event.body` for Step Functions Lambdas
5. Do NOT use `DocumentClient` (v2)
6. Do NOT set region in the model ID
7. Do NOT shorten the model ID
8. Do NOT include `data:image/jpeg;base64,` in image data
9. Do NOT forget CORS headers on API responses
10. Do NOT use `require()` — use ES module imports