// stage1-vision Lambda Function
// Analyzes photos using Bedrock vision to identify observable housing conditions
// Type: Step Functions Lambda (direct input, no CORS headers)

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { callBedrockWithImage } from "../utils/bedrock-client";
import { Stage1Input, Stage1Output } from "../types";

// Initialize S3 client
const s3 = new S3Client({ region: "us-east-1" });

// Validate environment variables
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET;
if (!PHOTOS_BUCKET) {
  throw new Error("PHOTOS_BUCKET environment variable is required");
}

// Stage 1 prompt (from prompts/stage1-vision.md)
const STAGE1_PROMPT = `You are a housing condition analyst. Examine this photo and describe what you physically observe. Do NOT diagnose problems or make legal conclusions. Only describe what you see.

For each observation, provide:
- description: what you physically see
- category: one of \`structural\`, \`electrical\`, \`plumbing\`, \`environmental\`, \`fire_safety\`, \`pest\`, \`heating\`
- confidence: \`high\`, \`medium\`, or \`low\`

Focus on visible conditions such as:
- dark discoloration
- water staining
- exposed wiring
- missing cover plates
- broken or missing smoke detectors
- pest evidence
- damaged surfaces
- unsafe fixtures
- visible deterioration

Respond ONLY with valid JSON in this format:

\`\`\`json
{
  "observations": [
    {
      "description": "dark discoloration on ceiling surface, approximately 2 square feet",
      "category": "environmental",
      "confidence": "high"
    }
  ]
}
\`\`\`

Rules:
- observations only
- no diagnosis
- no legal conclusions
- no extra text outside JSON`;

/**
 * Lambda handler for Stage 1 vision analysis
 * 
 * @param event - Stage1Input from orchestrator
 * @returns Stage1Output with observations
 */
export const handler = async (event: Stage1Input): Promise<Stage1Output> => {
  const { photoKey, address, jurisdiction } = event;
  
  console.log(`Stage 1: Analyzing photo ${photoKey}`);
  
  try {
    // 1. Retrieve photo from S3
    console.log(`Retrieving photo from S3: ${photoKey}`);
    const obj = await s3.send(new GetObjectCommand({
      Bucket: PHOTOS_BUCKET,
      Key: photoKey
    }));
    
    // 2. Convert S3 stream to base64
    const chunks: Uint8Array[] = [];
    for await (const chunk of obj.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString("base64");
    
    console.log(`Photo converted to base64, size: ${base64.length} chars`);
    
    // 3. Call Bedrock with vision
    console.log("Calling Bedrock vision API");
    const result = await callBedrockWithImage(base64, STAGE1_PROMPT);
    
    // 4. Extract observations from result
    const observations = result.observations || [];
    
    console.log(`Stage 1 complete: Found ${observations.length} observations`);
    
    // 5. Return observations with context
    return {
      observations,
      photoKey,
      address,
      jurisdiction
    };
  } catch (error) {
    console.error("Stage 1 failed:", error);
    
    if (error instanceof Error && error.message.includes("NoSuchKey")) {
      throw new Error(`Photo not found in S3: ${photoKey}`);
    }
    
    throw new Error(`Stage 1 vision analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
