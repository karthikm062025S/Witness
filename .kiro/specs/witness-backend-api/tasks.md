# Implementation Plan: WITNESS Backend API

## Overview

This plan implements a serverless AWS backend API for the WITNESS housing code violation detection system. The implementation follows a dependency-ordered approach: shared foundation code first, then Lambda functions in execution order, followed by infrastructure configuration, database seeding, and testing.

The system uses TypeScript throughout, with AWS Lambda (Node.js 22.x), Amazon Bedrock for AI processing, DynamoDB for reference data, S3 for photo storage, and Step Functions for orchestration.

## Tasks

- [x] 1. Set up project foundation and shared code
  - [x] 1.1 Create TypeScript type definitions
    - Create `src/shared/types.ts` with all interfaces: Observation, Violation, EnforcementContact, EvidenceLog, Stage1Input, Stage1Output, Stage2Input, Stage2Output, Stage3Input, Stage3Output, HousingCodeEntry
    - Use string literal types for category, confidence, and severity enums
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 1.2 Create Bedrock client utility
    - Create `src/backend/utils/bedrock-client.ts` with `callBedrock` and `callBedrockWithImage` functions
    - Use `@aws-sdk/client-bedrock-runtime` (NOT `@aws-sdk/client-bedrock`)
    - Include `anthropic_version: "bedrock-2023-05-31"` in all requests
    - Set `max_tokens: 4096`
    - Format image as base64 without `data:image/jpeg;base64,` prefix
    - Parse response: `JSON.parse(new TextDecoder().decode(response.body))`
    - Extract text: `result.content[0].text`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 1.3 Write property tests for Bedrock client
    - **Property 18: Bedrock Image Request Format**
    - **Property 19: Bedrock Response Parsing**
    - **Property 20: Bedrock Error Handling**
    - **Validates: Requirements 6.3, 6.5, 6.7**

  - [x] 1.4 Create CORS helper utility
    - Create `src/backend/utils/cors.ts` with `corsHeaders` export
    - Include headers: Access-Control-Allow-Origin (*), Access-Control-Allow-Headers (Content-Type), Access-Control-Allow-Methods (POST, OPTIONS), Content-Type (application/json)
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

  - [ ]* 1.5 Write unit tests for CORS helper
    - Test all required headers are present
    - Test header values are correct
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

- [x] 2. Implement get-upload-url Lambda (API Gateway)
  - [x] 2.1 Create get-upload-url Lambda function
    - Create `src/backend/lambdas/get-upload-url.ts`
    - Parse `event.body` JSON payload
    - Generate unique photo key: `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`
    - Use `getSignedUrl` with `PutObjectCommand` and 300 second expiration
    - Return JSON with `uploadUrl` and `photoKey` fields
    - Include CORS headers in response
    - Handle S3 client errors with 500 status code
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write unit tests for get-upload-url
    - Test pre-signed URL generation
    - Test response structure (uploadUrl and photoKey)
    - Test CORS headers presence
    - Test S3 client error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]* 2.3 Write property tests for upload URL generation
    - **Property 1: Pre-signed URL Generation**
    - **Property 2: Upload Response Structure**
    - **Property 3: CORS Headers Presence**
    - **Validates: Requirements 1.1, 1.2, 1.3, 5.5, 12.3, 12.4, 12.5, 12.6**

- [x] 3. Implement stage1-vision Lambda (Step Functions)
  - [x] 3.1 Create stage1-vision Lambda function
    - Create `src/backend/lambdas/stage1-vision.ts`
    - Accept direct input (no `event.body` parsing)
    - Retrieve photo from S3 using `GetObjectCommand`
    - Convert S3 stream to base64 string
    - Call `callBedrockWithImage` with base64 and Stage 1 prompt from `prompts/stage1-vision.md`
    - Parse Bedrock response into observations array
    - Return Stage1Output with observations, photoKey, address, jurisdiction
    - Do NOT include CORS headers
    - Throw errors with context for S3 failures, Bedrock failures, and JSON parsing failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 3.2 Write unit tests for stage1-vision
    - Test S3 GetObject retrieval
    - Test image to base64 conversion
    - Test Bedrock request format
    - Test observation parsing
    - Test valid category values
    - Test valid confidence values
    - Test S3 error handling
    - Test Bedrock error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 3.3 Write property tests for vision output
    - **Property 4: Vision Output Structure**
    - **Property 5: Valid Observation Categories and Confidence**
    - **Validates: Requirements 2.3, 2.8, 2.9**

- [ ] 4. Checkpoint - Verify foundation and Stage 1
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement stage2-matching Lambda (Step Functions)
  - [x] 5.1 Create stage2-matching Lambda function
    - Create `src/backend/lambdas/stage2-matching.ts`
    - Accept direct input (no `event.body` parsing)
    - Extract unique categories from observations array
    - Query DynamoDB HousingCodes table for each category using `QueryCommand`
    - Call `callBedrock` with observations, code entries, and Stage 2 prompt from `prompts/stage2-matching.md`
    - Parse Bedrock response into violations array
    - **CRITICAL**: Verify each violation's `code_display` exists in DynamoDB query results (anti-hallucination)
    - Filter out violations with unverified citations
    - Return Stage2Output with verified violations, photoKey, address, jurisdiction
    - Do NOT include CORS headers
    - Throw errors for DynamoDB failures
    - Return empty violations array if all citations filtered or no matches found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 5.2 Write unit tests for stage2-matching
    - Test DynamoDB queries for all categories
    - Test Bedrock request with observations and codes
    - Test violation parsing
    - Test citation verification logic
    - Test all violations have required fields
    - Test empty database results handling
    - Test all citations filtered scenario
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9_

  - [ ]* 5.3 Write property tests for code matching
    - **Property 6: Code Matcher Database Query**
    - **Property 7: Violation Output Structure**
    - **Property 8: Citation Verification (Anti-Hallucination)**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.9, 10.4**

- [x] 6. Implement stage3-complaint Lambda (Step Functions)
  - [x] 6.1 Create stage3-complaint Lambda function
    - Create `src/backend/lambdas/stage3-complaint.ts`
    - Accept direct input (no `event.body` parsing)
    - Query DynamoDB EnforcementContacts table for jurisdiction using `QueryCommand`
    - Call `callBedrock` with violations, property info, and Stage 3 prompt from `prompts/stage3-complaint.md`
    - Parse Bedrock response to extract complaint letter text
    - Construct Stage3Output with observations, violations, complaint_letter, evidence_log (timestamp, location, photo_reference), and contacts
    - Do NOT include CORS headers
    - Use default Virginia DHCD contact if no contacts found
    - Generate "no violations identified" letter if violations array is empty
    - Ensure disclaimer text is included in complaint letter
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 6.2 Write unit tests for stage3-complaint
    - Test DynamoDB query for jurisdiction
    - Test Bedrock request with violations and property info
    - Test complete output structure
    - Test evidence log fields
    - Test disclaimer presence in letter
    - Test empty violations handling
    - Test empty contacts handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8_

  - [ ]* 6.3 Write property tests for complaint generation
    - **Property 9: Enforcement Contacts Query**
    - **Property 10: Complaint Letter Presence**
    - **Property 11: Complete Stage 3 Output Structure**
    - **Property 12: Disclaimer Inclusion**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.6, 4.8**

- [x] 7. Implement orchestrator Lambda (API Gateway)
  - [x] 7.1 Create orchestrator Lambda function
    - Create `src/backend/lambdas/orchestrator.ts`
    - Parse `event.body` JSON payload
    - Validate required fields: photoKey, address, jurisdiction
    - Return 400 with validation error if fields missing
    - Invoke Step Functions using `StartSyncExecutionCommand` with input JSON
    - Parse Step Functions execution output
    - Return Stage3Output to client with 200 status code
    - Include CORS headers in response
    - Handle Step Functions errors with 500 status code
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 7.2 Write unit tests for orchestrator
    - Test missing photoKey returns 400
    - Test missing address returns 400
    - Test missing jurisdiction returns 400
    - Test Step Functions invocation with correct input
    - Test Step Functions error propagation
    - Test CORS headers presence
    - Test final output return
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 7.3 Write property tests for workflow orchestration
    - **Property 13: Workflow Invocation**
    - **Property 14: Sequential Stage Execution**
    - **Property 15: Stage Output Chaining**
    - **Property 16: Error Propagation**
    - **Property 17: Final Output Return**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.6, 5.7, 11.1**

- [ ] 8. Checkpoint - Verify all Lambda functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create infrastructure configuration
  - [x] 9.1 Create Step Functions state machine definition
    - Create `infra/step-functions-definition.json`
    - Define Express Workflow type
    - Chain Stage1Vision → Stage2Matching → Stage3Complaint
    - Use Lambda ARN placeholders for each stage
    - _Requirements: 5.2, 5.3, 5.8_

  - [x] 9.2 Create backend package.json
    - Create `src/backend/package.json`
    - Add dependencies: @aws-sdk/client-bedrock-runtime, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @aws-sdk/client-sfn
    - Add devDependencies: typescript, @types/aws-lambda, esbuild, fast-check (for property tests)
    - Add build script for TypeScript compilation
    - _Requirements: 6.1, 6.2_

  - [x] 9.3 Create backend tsconfig.json
    - Create `src/backend/tsconfig.json`
    - Configure for Node.js 22.x target
    - Set module to ES2023
    - Enable strict type checking
    - Set outDir to dist/
    - _Requirements: 7.1_

- [x] 10. Create DynamoDB seed script
  - [x] 10.1 Create seed-dynamodb script
    - Create `scripts/seed-dynamodb.ts`
    - Read `data/housing-codes.json` and batch-write to HousingCodes table
    - Create `data/enforcement-contacts.json` if it doesn't exist
    - Use `BatchWriteCommand` for efficient writes
    - Read table names from environment variables
    - Log errors and continue with remaining items on failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 10.2 Write unit tests for seed script
    - Test housing codes loading
    - Test enforcement contacts creation
    - Test batch write operations
    - Test error handling for failed writes
    - _Requirements: 8.1, 8.3, 8.6_

  - [ ]* 10.3 Write property test for seed completeness
    - **Property 21: Seed Script Completeness**
    - **Validates: Requirements 8.3**

- [ ] 11. Add environment variable validation
  - [ ] 11.1 Add environment variable checks to all Lambdas
    - Validate PHOTO_BUCKET_NAME (get-upload-url, stage1-vision)
    - Validate HOUSING_CODES_TABLE_NAME (stage2-matching)
    - Validate ENFORCEMENT_CONTACTS_TABLE_NAME (stage3-complaint)
    - Validate STATE_MACHINE_ARN (orchestrator)
    - Validate BEDROCK_MODEL_ID (all Bedrock-using Lambdas)
    - Validate AWS_REGION (all Lambdas)
    - Throw error at Lambda initialization if required variable missing
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 11.2 Write property test for environment validation
    - **Property 22: Environment Variable Validation**
    - **Validates: Requirements 9.7**

- [ ] 12. Add citation format compliance checks
  - [ ] 12.1 Verify citation format in stage2-matching
    - Ensure all `code_display` values use "VMC §" or "Va. Code §" prefixes
    - Ensure no "IPMC §" prefixes are used
    - Preserve exact `code_display` format from database
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 12.2 Verify citation format preservation in stage3-complaint
    - Ensure `code_display` values pass through unchanged from Stage 2
    - _Requirements: 10.5_

  - [ ]* 12.3 Write property tests for citation format
    - **Property 23: Citation Format Compliance**
    - **Property 24: Citation Format Preservation**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [ ] 13. Add graceful error handling
  - [ ] 13.1 Implement error handling in stage2-matching
    - Return empty violations array when no matching codes found
    - Return empty violations array when all citations filtered
    - Continue with empty array when DynamoDB returns no results
    - _Requirements: 11.2, 11.3, 11.5_

  - [ ] 13.2 Implement error handling in stage3-complaint
    - Generate "no violations identified" letter when violations array is empty
    - Use default contact when DynamoDB returns no results
    - _Requirements: 11.4, 11.5_

  - [ ] 13.3 Add CloudWatch logging to all Lambdas
    - Log Lambda invocation start/end
    - Log external service calls with timing
    - Log errors with full stack traces
    - Log citation verification results
    - Do NOT log photo image data or full Bedrock responses
    - _Requirements: 11.6_

  - [ ]* 13.4 Write property tests for error handling
    - **Property 25: Empty Code Match Handling**
    - **Property 26: Citation Filter Completeness**
    - **Property 27: Empty Violations Letter Generation**
    - **Property 28: Graceful Empty Query Handling**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**

- [ ] 14. Add HTTP status code handling
  - [ ] 14.1 Implement status codes in get-upload-url
    - Return 200 for successful requests
    - Return 500 for S3 client errors
    - _Requirements: 12.7, 12.9_

  - [ ] 14.2 Implement status codes in orchestrator
    - Return 200 for successful requests
    - Return 400 for invalid request payloads
    - Return 500 for Step Functions errors
    - _Requirements: 12.7, 12.8, 12.9_

  - [ ]* 14.3 Write property test for HTTP status codes
    - **Property 29: HTTP Status Code Correctness**
    - **Validates: Requirements 12.7, 12.8, 12.9**

- [ ] 15. Checkpoint - Verify complete implementation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration testing with demo photos
  - [ ]* 16.1 Test end-to-end pipeline with all demo photos
    - Test with `demo-photos/Black Mold Apartment Ceiling.jpg`
    - Test with `demo-photos/broken smoke detector.jpg`
    - Test with `demo-photos/cockroach infestation.jpg`
    - Test with `demo-photos/exposed electrical wiring.jpg`
    - Test with `demo-photos/water damaged ceiling.jpg`
    - Verify observations match expected categories
    - Verify citations are valid and verified
    - Verify complaint letters are well-formed
    - _Requirements: 2.1, 3.1, 4.1_

  - [ ]* 16.2 Test database integration
    - Seed test DynamoDB tables
    - Verify queries return expected results
    - Test with empty tables
    - Test with partial data
    - _Requirements: 3.1, 4.1, 8.3_

  - [ ]* 16.3 Test Bedrock integration
    - Verify vision analysis produces observations
    - Verify code matching produces violations
    - Verify complaint generation produces letters
    - Test error handling for invalid model IDs
    - _Requirements: 2.2, 3.2, 4.2_

- [ ] 17. Final checkpoint - End-to-end validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (100+ iterations with fast-check)
- Unit tests validate specific examples and edge cases
- The implementation order follows dependencies: foundation → Lambdas → infrastructure → testing
- All Lambda functions use TypeScript with Node.js 22.x runtime
- Citation verification in Stage 2 is the critical anti-hallucination mechanism
- CORS headers are required only for API Gateway Lambdas (get-upload-url, orchestrator)
- Step Functions Lambdas accept direct input without parsing event.body
