# Witness — Housing Code Violation Detector

## What this project does
A mobile-first web app where tenants photograph housing violations and AI identifies the building code being violated, then generates a formal complaint letter with filing instructions.

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: AWS Lambda (Node.js 22, TypeScript) + API Gateway HTTP API
- AI: Amazon Bedrock (Claude Haiku 3.5 with vision capability)
- Database: Amazon DynamoDB
  - HousingCodes table for housing code rules
  - EnforcementContacts table for filing contacts
- Storage: Amazon S3 for photo uploads
- Orchestration: AWS Step Functions (Express Workflow)
- Hosting: AWS Amplify
- Region: us-east-1

## Core Product Flow
1. User uploads or takes a photo of a housing issue
2. Photo is stored in S3
3. Stage 1 analyzes the visible condition in the image
4. Stage 2 matches the observation to relevant housing codes
5. Stage 3 generates a formal complaint letter and filing guidance
6. Frontend shows violations, code citations, letter, and next steps

## Coding Standards
- Use TypeScript for all frontend and backend files
- Use functional React components with hooks only
- Use Tailwind utility classes only
- No custom CSS files unless absolutely necessary
- All async operations use async/await with try/catch
- All AI outputs should be structured and include confidence levels when applicable
- Mobile-first responsive design
- No hardcoded AWS credentials
- Use environment variables for all AWS resource names and ARNs
- No console.log in production code

## Project Structure
- Backend Lambdas: `src/backend/lambdas/`
- Frontend pages: `src/frontend/src/pages/`
- Frontend components: `src/frontend/src/components/`
- Shared types: `src/shared/types.ts`
- Prompts: `prompts/`
- Seed data: `data/`

## API Contract
The app should be built around two main API endpoints:
- `POST /get-upload-url`
  - Returns a pre-signed S3 upload URL and photo key
- `POST /analyze`
  - Accepts `{ photoKey, address, jurisdiction }`
  - Returns the full pipeline result including observations, violations, complaint letter, evidence log, and contacts

Additional utility Lambda:
- `send-complaint` - Generates mailto: links for email clients (not exposed as API endpoint, used internally)

## Product Constraints
- This is a hackathon demo, so prioritize reliability and demo quality over extra features
- The app must feel polished on mobile
- The system should be built for a Virginia housing code use case first
- The demo flow must work end-to-end with obvious housing issue photos
- Always include a “not legal advice” disclaimer in the product experience

## Primary Goal
Build a working end-to-end AI-assisted tenant documentation tool that shows:
photo → analysis → code match → complaint generation → filing guidance