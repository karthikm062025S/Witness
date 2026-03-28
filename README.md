# WITNESS - Housing Code Violation Detector

A mobile-first web app that helps Virginia tenants document housing violations using AI-powered photo analysis, code matching, and automated complaint letter generation.

## 🎯 What It Does

1. **Upload Photo** - Tenant photographs a housing issue (mold, broken fixtures, etc.)
2. **AI Analysis** - Computer vision identifies observable conditions
3. **Code Matching** - Matches observations to Virginia building codes (VMC § and Va. Code §)
4. **Letter Generation** - Creates formal complaint letter with enforcement contacts
5. **Filing Guidance** - Provides step-by-step instructions for submitting to code enforcement

## 🏗️ Architecture

**3-Stage AI Pipeline** orchestrated by AWS Step Functions:
- **Stage 1**: Vision analysis using Amazon Bedrock Claude Haiku 4.5
- **Stage 2**: Code matching with anti-hallucination verification
- **Stage 3**: Complaint letter generation with enforcement contacts

**Tech Stack**:
- Frontend: React 18 + Vite + Tailwind CSS
- Backend: AWS Lambda (Node.js 22, TypeScript)
- AI: Amazon Bedrock (Claude Haiku 4.5 with vision)
- Database: DynamoDB (housing codes + contacts)
- Storage: S3 (photo uploads)
- API: API Gateway HTTP API
- Hosting: AWS Amplify

## 📁 Project Structure

```
witness/
├── .kiro/              # Kiro IDE configuration & specs
├── data/               # Housing codes & enforcement contacts
├── demo-photos/        # Test images (5 violation examples)
├── infra/              # Infrastructure as code
├── prompts/            # AI system prompts for 3 stages
├── scripts/            # Utility scripts (DynamoDB seeding)
├── src/
│   ├── backend/        # Lambda functions & utilities
│   ├── frontend/       # React application
│   └── shared/         # TypeScript types
├── ARCHITECTURE.md     # Detailed system architecture
├── BACKEND-READY-TO-MERGE.md  # Backend integration guide
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites
- AWS Account with Bedrock access enabled
- Node.js 22+
- Kiro IDE (optional but recommended)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd witness
   ```

2. **Review documentation**
   - Read `ARCHITECTURE.md` for system design
   - Read `BACKEND-READY-TO-MERGE.md` for API integration
   - Check `.kiro/specs/witness-backend-api/requirements.md` for detailed requirements

3. **AWS Setup** (see BACKEND-READY-TO-MERGE.md for details)
   - Backend is already deployed to AWS
   - API Base URL: `https://mbqglb3kxc.execute-api.us-east-1.amazonaws.com`

4. **Frontend Setup**
   ```bash
   cd src/frontend
   npm install
   # Create .env file with API_BASE_URL
   npm run dev
   ```

## 📊 Current Status

✅ **Completed**:
- Backend fully implemented and deployed to AWS
- All 6 Lambda functions working
- DynamoDB seeded with 28 items
- API Gateway configured with CORS
- Step Functions Express workflow deployed
- Frontend implementation complete

## 🎓 Key Features

### Anti-Hallucination Citation Verification
Unlike ChatGPT, Stage 2 verifies every AI-generated code citation against the actual DynamoDB database. Any citation not found is filtered out, ensuring 100% accuracy.

### Virginia-Specific Citations
Uses correct Virginia citation format:
- `VMC §` for Virginia Maintenance Code
- `Va. Code §` for Virginia statutes
- Never uses `IPMC §`

### Mobile-First Design
Optimized for tenants documenting issues on their phones with camera capture and touch-friendly UI.

### Complete Filing Guidance
Provides multiple filing options:
- Online form submission
- In-person delivery
- Phone reporting
- Escalation paths

## 📚 Documentation

- **ARCHITECTURE.md** - Complete system architecture, data flow, AWS services
- **BACKEND-READY-TO-MERGE.md** - Backend integration guide with API details
- **.kiro/specs/** - Formal requirements, design, and tasks
- **.kiro/steering/** - AI guidance files for development
- **prompts/** - AI system prompts for each pipeline stage

## 🔒 Security

**Hackathon Scope**:
- No authentication (demo only)
- CORS set to `*`
- File validation (jpg/png/webp, max 10MB)
- Pre-signed URLs expire in 5 minutes
- No PII storage

**Production Considerations**:
- Add API authentication
- Restrict CORS
- Implement rate limiting
- Add user accounts
- Encrypt sensitive data

## 💰 Cost

**Hackathon Demo**: < $1 total
- S3: ~$0.01
- DynamoDB: $0 (on-demand, minimal)
- Lambda: $0 (free tier)
- Bedrock: ~$0.50
- Step Functions: ~$0.01
- API Gateway: $0 (free tier)
- Amplify: $0 (free tier)

## 🤝 Contributing

This is a hackathon project. For questions or contributions, please open an issue.

## 📄 License

[Add license information]

## 🙏 Acknowledgments

- Virginia housing codes from official VMC and Va. Code sources
- Town of Blacksburg code enforcement contacts
- AWS for cloud infrastructure
- Anthropic Claude for AI capabilities

---

**Built for**: AWS + Kiro Hackathon  
**Region**: Virginia (Blacksburg focus)  
**Status**: Backend Deployed, Frontend Integration Ready  
**Last Updated**: March 28, 2026
