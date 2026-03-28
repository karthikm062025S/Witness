# Project Structure

```
witness/
├── .kiro/
│   ├── steering/          # AI assistant context files (this directory)
│   ├── hooks/             # Kiro automation hooks
│   └── settings/          # MCP and other Kiro settings
├── src/
│   ├── backend/
│   │   ├── lambdas/       # One file per Lambda function
│   │   │   ├── stage1-vision.ts       # Step Functions task — photo analysis via Bedrock
│   │   │   ├── stage2-matching.ts     # Step Functions task — DynamoDB code lookup + AI matching
│   │   │   ├── stage3-complaint.ts    # Step Functions task — complaint letter generation
│   │   │   ├── orchestrator.ts        # API Gateway handler — triggers Step Functions
│   │   │   └── get-upload-url.ts      # API Gateway handler — generates S3 pre-signed URL
│   │   ├── utils/
│   │   │   └── bedrock-client.ts      # Reusable Bedrock helper (callBedrock, callBedrockWithImage)
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/
│   │   └── src/
│   │       ├── components/            # Reusable React components
│   │       └── pages/                 # Page-level components (Upload, Processing, Results)
│   └── shared/
│       └── types.ts                   # Shared TypeScript interfaces used by both frontend and backend
├── data/
│   ├── housing-codes.json             # Seed data for DynamoDB HousingCodes table
│   └── enforcement-contacts.json      # Seed data for DynamoDB EnforcementContacts table
├── prompts/
│   ├── stage1-vision.md               # System prompt for visual analysis
│   ├── stage2-matching.md             # System prompt for code matching
│   └── stage3-complaint.md            # System prompt for complaint generation
├── infra/
│   └── step-functions-definition.json # Step Functions Express Workflow state machine definition
├── scripts/
│   └── seed-dynamodb.ts               # Script to seed DynamoDB tables from data/ files
├── demo-photos/                       # Test photos for local development
└── frontend_assets/                   # Brand assets (logos, color guides) — check before designing
```

## Key Conventions

- Step Functions Lambdas (stage1, stage2, stage3) receive raw event input — do NOT parse `event.body`
- API Gateway Lambdas (orchestrator, get-upload-url) DO parse `event.body` and return CORS headers
- All Lambda return objects for Step Functions; API Gateway Lambdas return `{ statusCode, headers, body }`
- Shared types live in `src/shared/types.ts` — import from `"../../shared/types"` in backend lambdas
- Bedrock helper lives in `src/backend/utils/bedrock-client.ts` — always use it, never instantiate Bedrock client directly in lambdas
- System prompts are stored in `prompts/` as markdown for easy editing without touching code
