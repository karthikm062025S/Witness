// stage2-matching Lambda Function
// Matches observations to Virginia codes with citation verification (anti-hallucination)
// Type: Step Functions Lambda (direct input, no CORS headers)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { callBedrock } from "../utils/bedrock-client";
import { Stage2Input, Stage2Output, HousingCodeEntry, Violation } from "../types";

// Initialize DynamoDB client
const dynamodb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" })
);

// Validate environment variables
const CODES_TABLE = process.env.CODES_TABLE;
if (!CODES_TABLE) {
  throw new Error("CODES_TABLE environment variable is required");
}

// Stage 2 prompt (from prompts/stage2-matching.md)
const STAGE2_PROMPT = `You are a housing code compliance analyst for Virginia.

Given these observations from a photo inspection and these housing code sections, determine which codes are likely being violated.

## Observations
{observations_json}

## Relevant Housing Code Sections
{dynamodb_results_json}

For each likely violation, respond ONLY with valid JSON in this format:

\`\`\`json
{
  "violations": [
    {
      "code_display": "VMC § 305.1",
      "code_section": "VMC_305_1",
      "title": "Interior Condition — General",
      "match_reasoning": "The ceiling shows visible unsanitary discoloration and deterioration that aligns with interior surface maintenance requirements.",
      "plain_english": "The inside surface of the home appears to be in an unhealthy or poorly maintained condition.",
      "confidence": "high",
      "severity": "moderate",
      "observation_ref": "dark discoloration on ceiling surface"
    }
  ]
}
\`\`\`

Rules:
- Only cite codes that appear in the provided housing code sections
- Do NOT invent code numbers
- Every violation must map to a provided observation
- Use plain, tenant-friendly explanations
- Return JSON only`;

/**
 * Lambda handler for Stage 2 code matching
 * 
 * @param event - Stage2Input from Stage 1
 * @returns Stage2Output with verified violations
 */
export const handler = async (event: Stage2Input): Promise<Stage2Output> => {
  const { observations, photoKey, address, jurisdiction } = event;
  
  console.log(`Stage 2: Matching ${observations.length} observations to codes`);
  
  try {
    // 1. Extract unique categories from observations
    const categories = [...new Set(observations.map(o => o.category))];
    console.log(`Querying codes for categories: ${categories.join(", ")}`);
    
    // 2. Query DynamoDB for relevant codes
    const codeEntries: HousingCodeEntry[] = [];
    
    for (const category of categories) {
      const result = await dynamodb.send(new QueryCommand({
        TableName: CODES_TABLE,
        KeyConditionExpression: "category = :cat",
        ExpressionAttributeValues: { ":cat": category }
      }));
      
      if (result.Items) {
        codeEntries.push(...(result.Items as HousingCodeEntry[]));
      }
    }
    
    console.log(`Retrieved ${codeEntries.length} code entries from DynamoDB`);
    
    // If no codes found, return empty violations
    if (codeEntries.length === 0) {
      console.log("No matching codes found in database");
      return {
        violations: [],
        observations,
        photoKey,
        address,
        jurisdiction
      };
    }
    
    // 3. Call Bedrock for code matching
    console.log("Calling Bedrock for code matching");
    const result = await callBedrock(STAGE2_PROMPT, {
      observations_json: observations,
      dynamodb_results_json: codeEntries
    });
    
    const aiViolations: Violation[] = result.violations || [];
    console.log(`Bedrock returned ${aiViolations.length} potential violations`);
    
    // 4. CRITICAL: Verify citations against database results (anti-hallucination)
    const verifiedViolations = aiViolations.filter(violation => {
      const isVerified = codeEntries.some(entry => entry.code_display === violation.code_display);
      
      if (!isVerified) {
        console.warn(`Filtered out hallucinated citation: ${violation.code_display}`);
      }
      
      return isVerified;
    });
    
    console.log(`Stage 2 complete: ${verifiedViolations.length} verified violations (filtered ${aiViolations.length - verifiedViolations.length})`);
    
    // 5. Return verified violations with observations passed through
    return {
      violations: verifiedViolations,
      observations,  // Pass through from Stage 1
      photoKey,
      address,
      jurisdiction
    };
  } catch (error) {
    console.error("Stage 2 failed:", error);
    throw new Error(`Stage 2 code matching failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
