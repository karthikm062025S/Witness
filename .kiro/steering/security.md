# Security Standards (Hackathon Scope)

## Must Do
1. Never hardcode AWS credentials in source code
2. Use Lambda IAM roles for AWS service access
3. Use environment variables for bucket names, table names, and ARNs
4. Add a "not legal advice" disclaimer on every page and generated document
5. Validate file type on upload
6. Validate file size on upload
7. Sanitize address input before passing it into prompts
8. Use CORS allow-origin `*` for hackathon scope only
9. Expire pre-signed URLs after 5 minutes
10. Use demo-only photos and demo-only addresses when presenting

## Upload Rules
- Allowed mime types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- Maximum file size:
  - `10MB`

## Privacy Rules
- Do not store real tenant personal information
- Do not store sensitive user identity data
- Do not log uploaded image contents to CloudWatch
- Do not keep unnecessary evidence metadata longer than needed for the demo

## Do NOT
- Do NOT add authentication for the hackathon demo
- Do NOT add rate limiting unless required later
- Do NOT use eval or dynamic code execution
- Do NOT expose raw stack traces to users
- Do NOT claim the system gives legal advice

## Required Disclaimer
Use this exact meaning everywhere:
- This tool provides documentation assistance only.
- It does not constitute legal advice.
- Consult a qualified attorney for legal guidance.