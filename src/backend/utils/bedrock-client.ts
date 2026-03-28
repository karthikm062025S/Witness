// Bedrock Client Utility for WITNESS Backend API
// Provides methods for calling Amazon Bedrock with text and image inputs

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Hardcoded model ID - Claude Haiku 4.5 (latest)
const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const REGION = "us-east-1";

// Initialize Bedrock client
const bedrock = new BedrockRuntimeClient({ region: REGION });

/**
 * Call Bedrock with text-only input (for Stage 2 and Stage 3)
 * Performs template variable substitution before sending to Bedrock
 * 
 * @param prompt - The prompt template with {placeholder} variables
 * @param context - Object with values to substitute into the prompt
 * @returns Parsed JSON response from Bedrock
 */
export async function callBedrock(prompt: string, context: Record<string, any>): Promise<any> {
  try {
    // Perform template variable substitution
    let processedPrompt = prompt;
    
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{${key}}`;
      let replacement: string;
      
      // Convert objects/arrays to JSON strings
      if (typeof value === 'object' && value !== null) {
        replacement = JSON.stringify(value, null, 2);
      } else {
        replacement = String(value);
      }
      
      processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), replacement);
    }
    
    // Call Bedrock
    const response = await bedrock.send(new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: processedPrompt
          }]
        }]
      })
    }));
    
    // Parse response
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const textContent = result.content[0].text;
    
    // Parse JSON from text content (handle code block fences)
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent.trim();
    const parsed = JSON.parse(jsonStr);
    
    return parsed;
  } catch (error) {
    console.error("Bedrock call failed:", error);
    throw new Error(`Bedrock API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Call Bedrock with image input (for Stage 1 vision analysis)
 * 
 * @param imageBase64 - Base64-encoded image data (without data URI prefix)
 * @param prompt - The prompt text to send with the image
 * @returns Parsed JSON response from Bedrock
 */
export async function callBedrockWithImage(imageBase64: string, prompt: string): Promise<any> {
  try {
    // Call Bedrock with image
    const response = await bedrock.send(new InvokeModelCommand({
      modelId: MODEL_ID,
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
                data: imageBase64
              }
            },
            {
              type: "text",
              text: prompt
            }
          ]
        }]
      })
    }));
    
    // Parse response
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const textContent = result.content[0].text;
    
    // Parse JSON from text content (handle code block fences)
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent.trim();
    const parsed = JSON.parse(jsonStr);
    
    return parsed;
  } catch (error) {
    console.error("Bedrock vision call failed:", error);
    throw new Error(`Bedrock vision API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
