# Requirements Document

## Introduction

The Email Complaint Sender feature enables users to send generated complaint letters via email to enforcement contacts directly from the WITNESS results page. 

**Implementation Note:** For hackathon demo scope, this feature uses mailto links instead of AWS SES email sending. The `send-complaint` Lambda generates mailto: URLs that open the user's default email client with pre-filled complaint content. This approach requires no email verification, no SES configuration, and works immediately for demo purposes.

## Glossary

- **Email_Service**: The AWS Lambda function that handles email sending operations
- **SES**: AWS Simple Email Service used for email delivery
- **Complaint_Letter**: The generated housing code violation complaint document from Stage 3
- **Enforcement_Contact**: The recipient email address for housing code enforcement agencies
- **API_Gateway**: The HTTP API endpoint that receives email send requests
- **Sender_Email**: The verified email address used as the "from" address in AWS SES

## Requirements

### Requirement 1: Email Sending Lambda Function

**User Story:** As a tenant, I want to send my complaint letter via email, so that I can submit my documentation to enforcement agencies electronically.

#### Acceptance Criteria

1. THE Email_Service SHALL accept complaint letter text as input
2. THE Email_Service SHALL accept one or more recipient email addresses as input
3. THE Email_Service SHALL accept sender information as input
4. WHEN the Email_Service receives a valid request, THE Email_Service SHALL send the email via AWS SES
5. WHEN the email is sent successfully, THE Email_Service SHALL return a success status with message ID
6. IF the email fails to send, THEN THE Email_Service SHALL return an error status with descriptive message
7. THE Email_Service SHALL use environment variables for the Sender_Email address
8. THE Email_Service SHALL execute within 30 seconds timeout

### Requirement 2: API Gateway Endpoint

**User Story:** As a frontend developer, I want a REST API endpoint for sending emails, so that I can integrate the send functionality into the UI.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose a POST endpoint at `/send-email`
2. WHEN a POST request is received at `/send-email`, THE API_Gateway SHALL invoke the Email_Service
3. THE API_Gateway SHALL return CORS headers allowing origin `*`
4. THE API_Gateway SHALL return appropriate HTTP status codes (200 for success, 400 for validation errors, 500 for server errors)
5. THE API_Gateway SHALL accept JSON request body with complaint letter and recipient addresses

### Requirement 3: Email Content Formatting

**User Story:** As a tenant, I want my email to include proper formatting and disclaimers, so that my complaint is professional and legally appropriate.

#### Acceptance Criteria

1. THE Email_Service SHALL include the complaint letter text in the email body
2. THE Email_Service SHALL prepend a brief introduction to the email body
3. THE Email_Service SHALL append the legal disclaimer "This tool provides documentation assistance only. It does not constitute legal advice. Consult a qualified attorney for legal guidance." to every email
4. THE Email_Service SHALL use a clear subject line format: "Housing Code Violation Complaint - [Address]"
5. THE Email_Service SHALL format the email body as plain text
6. THE Email_Service SHALL include the property address in the email content

### Requirement 4: Input Validation

**User Story:** As a system administrator, I want email inputs validated, so that the system prevents malformed or malicious requests.

#### Acceptance Criteria

1. WHEN an email address is provided, THE Email_Service SHALL validate it matches standard email format (contains @ and domain)
2. WHEN the complaint letter text exceeds 50,000 characters, THE Email_Service SHALL reject the request
3. WHEN the recipient email list is empty, THE Email_Service SHALL reject the request
4. WHEN the recipient email list contains more than 10 addresses, THE Email_Service SHALL reject the request
5. IF validation fails, THEN THE Email_Service SHALL return a 400 status code with validation error details
6. THE Email_Service SHALL sanitize email addresses to prevent injection attacks

### Requirement 5: Demo-Only Email Addresses

**User Story:** As a demo presenter, I want to use fake email addresses for testing, so that I don't send emails to real enforcement agencies during demonstrations.

#### Acceptance Criteria

1. THE Email_Service SHALL accept demo email addresses in the format `demo-*@example.com`
2. THE Email_Service SHALL accept demo email addresses in the format `test-*@example.com`
3. WHEN demo mode is enabled via environment variable, THE Email_Service SHALL log email content instead of sending
4. WHERE demo mode is configured, THE Email_Service SHALL return success status without actual SES invocation
5. THE Email_Service SHALL use environment variable `DEMO_MODE` to control demo behavior

### Requirement 6: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can troubleshoot issues and monitor system health.

#### Acceptance Criteria

1. WHEN an AWS SES error occurs, THE Email_Service SHALL log the error details to CloudWatch
2. WHEN validation fails, THE Email_Service SHALL log the validation error without logging PII
3. THE Email_Service SHALL NOT log email addresses to CloudWatch
4. THE Email_Service SHALL NOT log complaint letter content to CloudWatch
5. IF an unexpected error occurs, THEN THE Email_Service SHALL return a generic error message to the client
6. THE Email_Service SHALL log request metadata (timestamp, request ID, success/failure status)

### Requirement 7: AWS SES Configuration

**User Story:** As a system administrator, I want proper SES configuration, so that emails are delivered reliably and securely.

#### Acceptance Criteria

1. THE Email_Service SHALL use AWS IAM role for SES access (no hardcoded credentials)
2. THE Email_Service SHALL use the Sender_Email from environment variable `SENDER_EMAIL`
3. THE Email_Service SHALL operate in the `us-east-1` region
4. THE Email_Service SHALL use AWS SDK v3 for SES operations
5. WHEN the Sender_Email is not verified in SES, THE Email_Service SHALL return an error
6. THE Email_Service SHALL set the reply-to address to the Sender_Email

### Requirement 8: Request and Response Format

**User Story:** As a frontend developer, I want clear request and response formats, so that I can integrate the API correctly.

#### Acceptance Criteria

1. THE API_Gateway SHALL accept requests with JSON body containing `complaintText`, `recipientEmails`, and `propertyAddress` fields
2. WHEN a request succeeds, THE Email_Service SHALL return JSON with `success: true` and `messageId`
3. WHEN a request fails, THE Email_Service SHALL return JSON with `success: false` and `error` message
4. THE Email_Service SHALL validate that `complaintText` is a non-empty string
5. THE Email_Service SHALL validate that `recipientEmails` is an array of strings
6. THE Email_Service SHALL validate that `propertyAddress` is a non-empty string
