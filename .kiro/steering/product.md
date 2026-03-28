# Witness — Product Summary

Witness is a mobile-first web app that helps tenants document housing violations. A tenant photographs a problem in their rental unit, and the app uses AI to:

1. Identify what's physically wrong in the photo
2. Match observations to real Virginia housing code violations (IPMC/VMC + Va. Code)
3. Generate a formal complaint letter addressed to the correct local enforcement office

The key differentiator is citation verification — every code citation is checked against a real DynamoDB database before being shown to the user, preventing AI hallucination of fake code numbers.

## Target User
Tenants in Virginia (initially Blacksburg/Montgomery County) who need to document and report housing violations but don't know the legal process.

## Core Value
"Know your rights. Document violations. Take action." — turns a photo into a ready-to-file complaint in ~20 seconds.

## Disclaimer
Every output must include: "This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance."
