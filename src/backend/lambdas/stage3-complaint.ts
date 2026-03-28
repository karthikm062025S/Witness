// stage3-complaint Lambda Function
// Generates formal complaint letter with enforcement contacts
// Type: Step Functions Lambda (direct input, no CORS headers)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { callBedrock } from "../utils/bedrock-client";
import { Stage3Input, Stage3Output, EnforcementContact } from "../types";

// Initialize DynamoDB client
const dynamodb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" })
);

// Validate environment variables
const CONTACTS_TABLE = process.env.CONTACTS_TABLE;
if (!CONTACTS_TABLE) {
  throw new Error("CONTACTS_TABLE environment variable is required");
}

// Stage 3 prompt (from prompts/stage3-complaint.md)
const STAGE3_PROMPT = `You are a tenant rights documentation assistant for Virginia.

Generate a formal complaint letter to code enforcement using the information below.

## Property Information
Address: {address}
Date: {current_date}
Jurisdiction: {jurisdiction}

## Violations Found
{violations_json}

## Filing Contact
{contacts_json}

Write a professional, firm complaint letter that:
- addresses the appropriate code enforcement office
- states the specific code sections being violated using the exact \`code_display\` values
- describes the observed conditions
- requests an inspection
- includes the date and property address
- uses formal but accessible language

Then respond ONLY with valid JSON in this format:

\`\`\`json
{
  "letter": "full complaint letter text here",
  "summary": "1-2 sentence summary of violations found"
}
\`\`\`

The generated letter must end with this exact sentence:

"This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance."

Return JSON only.`;

// Default Virginia DHCD contact (fallback)
const DEFAULT_CONTACT: EnforcementContact = {
  jurisdiction: "virginia",
  contact_type: "state_escalation",
  display_name: "Virginia Department of Housing and Community Development",
  method: "phone",
  phone: "(804) 371-7150",
  website: "dhcd.virginia.gov"
};

/**
 * Lambda handler for Stage 3 complaint generation
 * 
 * @param event - Stage3Input from Stage 2
 * @returns Stage3Output with complaint letter and contacts
 */
export const handler = async (event: Stage3Input): Promise<Stage3Output> => {
  const { violations, observations, photoKey, address, jurisdiction } = event;
  
  console.log(`Stage 3: Generating complaint for ${violations.length} violations`);
  
  try {
    // 1. Query enforcement contacts for jurisdiction
    console.log(`Querying contacts for jurisdiction: ${jurisdiction}`);
    const contactsResult = await dynamodb.send(new QueryCommand({
      TableName: CONTACTS_TABLE,
      KeyConditionExpression: "jurisdiction = :jur",
      ExpressionAttributeValues: { ":jur": jurisdiction }
    }));
    
    let contacts: EnforcementContact[] = contactsResult.Items as EnforcementContact[] || [];
    
    // Also query for Virginia state escalation contact
    const virginiaResult = await dynamodb.send(new QueryCommand({
      TableName: CONTACTS_TABLE,
      KeyConditionExpression: "jurisdiction = :jur",
      ExpressionAttributeValues: { ":jur": "virginia" }
    }));
    
    if (virginiaResult.Items) {
      contacts = [...contacts, ...(virginiaResult.Items as EnforcementContact[])];
    }
    
    // Use default contact if none found
    if (contacts.length === 0) {
      console.warn("No contacts found, using default Virginia DHCD contact");
      contacts = [DEFAULT_CONTACT];
    }
    
    console.log(`Found ${contacts.length} enforcement contacts`);
    
    // 2. Generate complaint letter
    console.log("Calling Bedrock for complaint generation");
    const bedrockResult = await callBedrock(STAGE3_PROMPT, {
      address,
      current_date: new Date().toISOString(),
      jurisdiction,
      violations_json: violations,
      contacts_json: contacts
    });
    
    // 3. Extract letter from result
    const complaintLetter = bedrockResult.letter || "";
    
    if (!complaintLetter) {
      throw new Error("Bedrock did not return a complaint letter");
    }
    
    console.log(`Stage 3 complete: Generated complaint letter (${complaintLetter.length} chars)`);
    
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
  } catch (error) {
    console.error("Stage 3 failed:", error);
    throw new Error(`Stage 3 complaint generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
