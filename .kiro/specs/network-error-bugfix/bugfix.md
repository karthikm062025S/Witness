# Bugfix Requirements Document

## Introduction

The Witness app is experiencing "network failed" errors when users attempt to analyze uploaded photos. The error occurs after the photo upload completes, during the backend API call to process the image through the 3-stage AI pipeline (vision analysis → code matching → complaint generation).

The app's architecture involves:
- Frontend uploads photo to S3 via pre-signed URL from `/get-upload-url` endpoint
- Frontend then calls `/analyze` endpoint with photoKey, address, and jurisdiction
- Backend orchestrator Lambda triggers Step Functions workflow
- Step Functions chains 3 stage Lambdas (vision → matching → complaint)
- Results are returned to frontend for display

The "network failed" error prevents users from receiving analysis results, forcing the app to fall back to mock data. This bugfix will systematically identify and resolve the root cause(s) preventing successful API communication.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the frontend calls `POST /analyze` with valid photoKey, address, and jurisdiction THEN the system returns a network error instead of processing the request

1.2 WHEN the API Gateway endpoint is not deployed or misconfigured THEN the system fails to route requests to the orchestrator Lambda

1.3 WHEN Lambda functions are missing required environment variables (PHOTOS_BUCKET, CODES_TABLE, CONTACTS_TABLE, STATE_MACHINE_ARN) THEN the system throws runtime errors during execution

1.4 WHEN CORS headers are missing or misconfigured on API responses THEN the browser blocks the response with a CORS error

1.5 WHEN the Step Functions state machine is not created or the ARN is incorrect THEN the orchestrator Lambda fails to start the workflow

1.6 WHEN DynamoDB tables (HousingCodes, EnforcementContacts) do not exist or are empty THEN Stage 2 matching fails to retrieve code data

1.7 WHEN Bedrock model access is not enabled in the AWS account THEN Stage 1 and Stage 2 Lambdas fail with access denied errors

1.8 WHEN Lambda execution roles lack required IAM permissions THEN the Lambdas fail to access S3, DynamoDB, Step Functions, or Bedrock

### Expected Behavior (Correct)

2.1 WHEN the frontend calls `POST /analyze` with valid photoKey, address, and jurisdiction THEN the system SHALL successfully process the request and return analysis results

2.2 WHEN the API Gateway endpoint is properly deployed and configured THEN the system SHALL route requests to the orchestrator Lambda successfully

2.3 WHEN Lambda functions have all required environment variables configured THEN the system SHALL execute without runtime configuration errors

2.4 WHEN CORS headers are properly configured on all API responses THEN the browser SHALL accept the responses without CORS errors

2.5 WHEN the Step Functions state machine exists and the correct ARN is provided THEN the orchestrator Lambda SHALL successfully start the workflow

2.6 WHEN DynamoDB tables exist and contain seed data THEN Stage 2 matching SHALL successfully retrieve housing code entries

2.7 WHEN Bedrock model access is enabled for the required model THEN Stage 1 and Stage 2 Lambdas SHALL successfully call the Bedrock API

2.8 WHEN Lambda execution roles have all required IAM permissions THEN the Lambdas SHALL successfully access all required AWS services

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `/get-upload-url` endpoint is called THEN the system SHALL CONTINUE TO generate valid pre-signed S3 URLs

3.2 WHEN a photo is uploaded to S3 using the pre-signed URL THEN the system SHALL CONTINUE TO store the photo successfully

3.3 WHEN the frontend receives a successful API response THEN the system SHALL CONTINUE TO navigate to results.html and display the analysis

3.4 WHEN the API call fails and falls back to mock data THEN the system SHALL CONTINUE TO display the mock results without crashing

3.5 WHEN valid analysis results are returned THEN the system SHALL CONTINUE TO include observations, violations, complaint letter, evidence log, and contacts in the expected format

3.6 WHEN the user provides valid address and jurisdiction inputs THEN the system SHALL CONTINUE TO pass them through the pipeline correctly
