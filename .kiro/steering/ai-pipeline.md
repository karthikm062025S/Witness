# AI Pipeline Architecture

## Overview
Witness uses a three-stage AI pipeline orchestrated by AWS Step Functions.
Each stage is a separate Lambda.
The output of each stage becomes the input to the next stage.

Flow:
photo upload → Stage 1 visual analysis → Stage 2 code matching → Stage 3 complaint generation → frontend results

## Stage 1 — Visual Analysis
- Lambda file: `src/backend/lambdas/stage1-vision.ts`
- Model: Amazon Bedrock Claude Haiku 3.5 with vision
- Input:
  - `photoKey`
  - `address`
  - `jurisdiction`
- Process:
  1. Retrieve the uploaded image from S3
  2. Convert image to base64
  3. Send image + prompt to Bedrock
  4. Return only visible observations
- Output format:
```json
{
  "observations": [
    {
      "description": "dark discoloration on ceiling surface",
      "category": "environmental",
      "confidence": "high"
    }
  ],
  "photoKey": "uploads/example.jpg",
  "address": "123 Turner St, Blacksburg, VA",
  "jurisdiction": "blacksburg"
}