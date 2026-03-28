// get-upload-url Lambda Function
// Generates pre-signed S3 URLs for photo uploads
// Type: API Gateway Lambda (parses event.body, returns CORS headers)

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { corsHeaders } from "../utils/cors";

// Initialize S3 client
const s3 = new S3Client({ region: "us-east-1" });

// Validate environment variables
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET;
if (!PHOTOS_BUCKET) {
  throw new Error("PHOTOS_BUCKET environment variable is required");
}

/**
 * Lambda handler for generating pre-signed S3 upload URLs
 * 
 * @param event - API Gateway HTTP API event
 * @returns Response with uploadUrl and photoKey
 */
export const handler = async (_event: any) => {
  try {
    console.log("Generating upload URL");
    
    // Parse request body (optional metadata) - not currently used
    // const body = JSON.parse(event.body || "{}");
    
    // Generate unique photo key
    const photoKey = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;
    
    // Generate pre-signed URL with 5-minute expiration
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: PHOTOS_BUCKET,
        Key: photoKey,
        ContentType: "image/jpeg"
      }),
      { expiresIn: 300 }  // 5 minutes
    );
    
    console.log(`Generated upload URL for key: ${photoKey}`);
    
    // Return success response with CORS headers
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        uploadUrl,
        photoKey
      })
    };
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    
    // Return error response with CORS headers
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
