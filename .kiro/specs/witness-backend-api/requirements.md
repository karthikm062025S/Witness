# Requirements Document

## Introduction

WITNESS is a housing code violation detection system for Virginia tenants. The backend API provides a serverless AWS infrastructure with a 3-stage AI pipeline that analyzes photos of housing violations, matches observations to Virginia building codes, and generates formal complaint letters with enforcement contact information.

## Glossary

- **Vision_Analyzer**: The Lambda function that processes photos using Amazon Bedrock Claude with vision capability to identify observable housing conditions
- **Code_Matcher**: The Lambda function that queries DynamoDB and uses Bedrock to match observations to Virginia building code sections
- **Complaint_Generator**: The Lambda function that generates formal complaint letters with enforcement contact information
- **Orchestrator**: The Lambda function that receives API requests and triggers the Step Functions workflow
- **Upload_URL_Generator**: The Lambda function that generates pre-signed S3 URLs for photo uploads
- **Step_Functions_Workflow**: The Express Workflow that chains Vision_Analyzer, Code_Matcher, and Complaint_Generator
- **Bedrock_Client**: The utility module that provides methods for calling Amazon Bedrock with text and image inputs
- **HousingCodes_Table**: The DynamoDB table storing Virginia building code entries
- **EnforcementContacts_Table**: The DynamoDB table storing enforcement contact information by jurisdiction
- **Photo_Bucket**: The S3 bucket for storing uploaded violation photos
- **System**: The complete WITNESS backend API infrastructure

## Requirements

### Requirement 1: Photo Upload URL Generation

**User Story:** As a tenant, I want to securely upload photos of housing violations, so that I can document conditions for code enforcement review

#### Acceptance Criteria

1. WHEN a client requests an upload URL, THE Upload_URL_Generator SHALL generate a pre-signed S3 PUT URL with 15-minute expiration
2. THE Upload_URL_Generator SHALL return both the upload URL and the photo key identifier
3. THE Upload_URL_Generator SHALL include CORS headers in the response
4. THE Upload_URL_Generator SHALL parse the event.body JSON payload
5. IF the S3 client fails to generate a pre-signed URL, THEN THE Upload_URL_Generator SHALL return an error response with status code 500

### Requirement 2: Vision-Based Observation Detection

**User Story:** As a code enforcement analyst, I want AI to identify observable housing conditions in photos, so that I can focus on verifiable facts rather than subjective interpretations

#### Acceptance Criteria

1. WHEN the Vision_Analyzer receives a photo key, THE Vision_Analyzer SHALL retrieve the photo from Photo_Bucket
2. THE Vision_Analyzer SHALL call Bedrock_Client with the photo and the Stage 1 system prompt from prompts.md
3. THE Vision_Analyzer SHALL parse the Bedrock response into an array of observations with description, category, and confidence fields
4. THE Vision_Analyzer SHALL use the Claude model with vision capability
5. THE Vision_Analyzer SHALL NOT parse event.body or include CORS headers
6. IF the photo cannot be retrieved from S3, THEN THE Vision_Analyzer SHALL return an error with the photo key
7. IF Bedrock returns invalid JSON, THEN THE Vision_Analyzer SHALL return an error with the raw response
8. THE Vision_Analyzer SHALL categorize observations as structural, electrical, plumbing, environmental, fire_safety, pest, or heating
9. THE Vision_Analyzer SHALL assign confidence levels of high, medium, or low to each observation

### Requirement 3: Virginia Code Matching with Anti-Hallucination Verification

**User Story:** As a tenant advocate, I want AI-matched code citations to be verified against the actual database, so that I can trust the legal references are accurate and not hallucinated

#### Acceptance Criteria

1. WHEN the Code_Matcher receives observations, THE Code_Matcher SHALL query HousingCodes_Table for entries matching the observation categories
2. THE Code_Matcher SHALL call Bedrock_Client with observations, retrieved code entries, and the Stage 2 system prompt from prompts.md
3. THE Code_Matcher SHALL parse the Bedrock response into an array of violations
4. THE Code_Matcher SHALL verify each cited code_display value exists in the HousingCodes_Table query results
5. IF a violation cites a code_display not found in the database results, THEN THE Code_Matcher SHALL exclude that violation from the output
6. THE Code_Matcher SHALL NOT parse event.body or include CORS headers
7. THE Code_Matcher SHALL use only text-based Bedrock calls without image input
8. IF the DynamoDB query fails, THEN THE Code_Matcher SHALL return an error
9. THE Code_Matcher SHALL include match_reasoning, plain_english, confidence, and severity fields for each verified violation

### Requirement 4: Formal Complaint Letter Generation

**User Story:** As a tenant, I want a professionally formatted complaint letter with enforcement contacts, so that I can submit documentation to the appropriate authorities

#### Acceptance Criteria

1. WHEN the Complaint_Generator receives violations and property information, THE Complaint_Generator SHALL query EnforcementContacts_Table for the specified jurisdiction
2. THE Complaint_Generator SHALL call Bedrock_Client with violations, property information, and the Stage 3 system prompt from prompts.md
3. THE Complaint_Generator SHALL parse the Bedrock response to extract the complaint letter text
4. THE Complaint_Generator SHALL construct a complete output object with observations, violations, complaint_letter, and evidence_log fields
5. THE Complaint_Generator SHALL NOT parse event.body or include CORS headers
6. THE Complaint_Generator SHALL include timestamp, location, and photo_reference in the evidence_log
7. IF the EnforcementContacts_Table query returns no results, THEN THE Complaint_Generator SHALL use a default enforcement contact
8. THE Complaint_Generator SHALL ensure the complaint letter includes the exact disclaimer text from the Stage 3 prompt

### Requirement 5: End-to-End Workflow Orchestration

**User Story:** As a system operator, I want the three analysis stages to execute sequentially with proper error handling, so that the pipeline produces reliable results

#### Acceptance Criteria

1. WHEN the Orchestrator receives an analysis request, THE Orchestrator SHALL trigger the Step_Functions_Workflow with the photo key, address, and jurisdiction
2. THE Step_Functions_Workflow SHALL execute Vision_Analyzer, then Code_Matcher, then Complaint_Generator in sequence
3. THE Step_Functions_Workflow SHALL pass the output of each stage as input to the next stage
4. THE Orchestrator SHALL parse event.body JSON payload
5. THE Orchestrator SHALL include CORS headers in the response
6. IF any stage in the workflow fails, THEN THE Step_Functions_Workflow SHALL propagate the error to the Orchestrator
7. THE Orchestrator SHALL return the final Complaint_Generator output to the client
8. THE Step_Functions_Workflow SHALL use Express Workflow type for synchronous execution

### Requirement 6: Bedrock Client Integration

**User Story:** As a backend developer, I want a reusable Bedrock client utility, so that I can consistently call Bedrock for text and vision requests across all Lambda functions

#### Acceptance Criteria

1. THE Bedrock_Client SHALL provide a callBedrock method for text-only requests
2. THE Bedrock_Client SHALL provide a callBedrockWithImage method for vision requests
3. WHEN callBedrockWithImage is invoked, THE Bedrock_Client SHALL format the image as a base64-encoded JPEG in the messages array
4. THE Bedrock_Client SHALL use the Claude model identifier from environment variables
5. THE Bedrock_Client SHALL parse the Bedrock response and extract the text content from the first content block
6. THE Bedrock_Client SHALL set max_tokens to 4096 for all requests
7. IF Bedrock returns an error response, THEN THE Bedrock_Client SHALL throw an error with the response details

### Requirement 7: TypeScript Type Definitions

**User Story:** As a backend developer, I want strongly-typed interfaces for all data structures, so that I can catch type errors at compile time

#### Acceptance Criteria

1. THE System SHALL define a Stage1Output interface with observations array
2. THE System SHALL define a Stage2Output interface with violations array
3. THE System SHALL define a Stage3Output interface with observations, violations, complaint_letter, and evidence_log fields
4. THE System SHALL define an Observation interface with description, category, and confidence fields
5. THE System SHALL define a Violation interface with code_display, title, match_reasoning, plain_english, confidence, and severity fields
6. THE System SHALL define an EnforcementContact interface with name, title, department, address, phone, and email fields
7. THE System SHALL define an EvidenceLog interface with timestamp, location, and photo_reference fields
8. THE System SHALL use string literal types for category values: structural, electrical, plumbing, environmental, fire_safety, pest, heating
9. THE System SHALL use string literal types for confidence values: high, medium, low
10. THE System SHALL use string literal types for severity values: high, moderate, low

### Requirement 8: DynamoDB Data Seeding

**User Story:** As a system administrator, I want to seed DynamoDB tables with Virginia housing codes and enforcement contacts, so that the system has the necessary reference data

#### Acceptance Criteria

1. THE System SHALL provide a seed script that loads housing-codes.json into HousingCodes_Table
2. THE System SHALL provide a seed script that creates enforcement-contacts.json if it does not exist
3. WHEN the seed script runs, THE System SHALL batch-write all 22 Virginia code entries to HousingCodes_Table
4. THE System SHALL use code_section as the partition key for HousingCodes_Table
5. THE System SHALL use jurisdiction as the partition key for EnforcementContacts_Table
6. IF a DynamoDB write fails, THEN THE System SHALL log the error and continue with remaining items
7. THE System SHALL read table names from environment variables

### Requirement 9: Environment Configuration

**User Story:** As a DevOps engineer, I want all AWS resource identifiers in environment variables, so that I can deploy to different environments without code changes

#### Acceptance Criteria

1. THE System SHALL read Photo_Bucket name from PHOTO_BUCKET_NAME environment variable
2. THE System SHALL read HousingCodes_Table name from HOUSING_CODES_TABLE_NAME environment variable
3. THE System SHALL read EnforcementContacts_Table name from ENFORCEMENT_CONTACTS_TABLE_NAME environment variable
4. THE System SHALL read Step_Functions_Workflow ARN from STATE_MACHINE_ARN environment variable
5. THE System SHALL read Bedrock model identifier from BEDROCK_MODEL_ID environment variable
6. THE System SHALL read AWS region from AWS_REGION environment variable
7. IF a required environment variable is missing, THEN THE System SHALL throw an error at Lambda initialization

### Requirement 10: Citation Format Compliance

**User Story:** As a legal aid attorney, I want code citations to use the correct Virginia format, so that enforcement officials recognize the references

#### Acceptance Criteria

1. THE System SHALL use "VMC §" prefix for Virginia Maintenance Code sections
2. THE System SHALL use "Va. Code §" prefix for Virginia state code sections
3. THE System SHALL NOT use "IPMC §" prefix for any citations
4. THE Code_Matcher SHALL only output code_display values that match the format in HousingCodes_Table
5. THE Complaint_Generator SHALL preserve the exact code_display format from Code_Matcher output

### Requirement 11: Graceful Error Handling

**User Story:** As a system operator, I want the pipeline to handle errors gracefully without crashing, so that partial results can still be useful

#### Acceptance Criteria

1. IF the Vision_Analyzer fails, THEN THE System SHALL return an error response without proceeding to Code_Matcher
2. IF the Code_Matcher finds no matching codes, THEN THE Code_Matcher SHALL return an empty violations array
3. IF the Code_Matcher verification excludes all violations, THEN THE Code_Matcher SHALL return an empty violations array
4. IF the Complaint_Generator receives empty violations, THEN THE Complaint_Generator SHALL generate a letter stating no code violations were identified
5. IF a DynamoDB query returns no results, THEN THE System SHALL continue with empty data rather than throwing an error
6. THE System SHALL log all errors to CloudWatch Logs with sufficient context for debugging

### Requirement 12: API Gateway Integration

**User Story:** As a frontend developer, I want RESTful API endpoints with proper CORS support, so that I can call the backend from a web application

#### Acceptance Criteria

1. THE System SHALL expose POST /get-upload-url endpoint via API Gateway HTTP API
2. THE System SHALL expose POST /analyze endpoint via API Gateway HTTP API
3. THE System SHALL include Access-Control-Allow-Origin header with value "*" in all API Gateway responses
4. THE System SHALL include Access-Control-Allow-Headers header with value "Content-Type" in all API Gateway responses
5. THE System SHALL include Access-Control-Allow-Methods header with value "POST, OPTIONS" in all API Gateway responses
6. THE System SHALL return JSON responses with Content-Type header "application/json"
7. THE System SHALL return status code 200 for successful requests
8. THE System SHALL return status code 400 for invalid request payloads
9. THE System SHALL return status code 500 for internal server errors
