// orchestrator Lambda Function
// Receives API requests and triggers Step Functions workflow
// Type: API Gateway Lambda (parses event.body, returns CORS headers)

import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";
import { corsHeaders } from "../utils/cors";

// Initialize Step Functions client
const sfn = new SFNClient({ region: "us-east-1" });

// Validate environment variables
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;
if (!STATE_MACHINE_ARN) {
  throw new Error("STATE_MACHINE_ARN environment variable is required");
}

/**
 * Lambda handler for orchestrating the analysis workflow
 * 
 * @param event - API Gateway HTTP API event
 * @returns Response with Stage 3 output
 */
export const handler = async (event: any) => {
  try {
    console.log("Orchestrator: Parsing request");
    
    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { photoKey, address, jurisdiction } = body;
    
    // Validate required fields
    if (!photoKey || !address || !jurisdiction) {
      console.warn("Missing required fields in request");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing required fields",
          required: ["photoKey", "address", "jurisdiction"]
        })
      };
    }
    
    console.log(`Orchestrator: Starting workflow for photo ${photoKey}`);
    
    // Start Step Functions execution (synchronous)
    const execution = await sfn.send(new StartSyncExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      input: JSON.stringify({ photoKey, address, jurisdiction })
    }));
    
    // Check execution status
    if (execution.status === "FAILED") {
      console.error("Step Functions execution failed:", execution.error, execution.cause);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Pipeline execution failed",
          details: execution.error || "Unknown error",
          cause: execution.cause || "No cause provided",
          executionArn: execution.executionArn
        })
      };
    }
    
    // Parse output
    const output = JSON.parse(execution.output || "{}");
    
    console.log(`Orchestrator: Workflow complete, returning ${output.violations?.length || 0} violations`);
    
    // Return success response with CORS headers
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(output)
    };
  } catch (error) {
    console.error("Orchestrator failed:", error);
    
    // Return error response with CORS headers
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Pipeline execution failed",
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
