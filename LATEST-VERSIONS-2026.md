# Latest Technology Versions (March 2026)

This document tracks the latest stable versions of all technologies used in the WITNESS project as of March 28, 2026.

## Runtime & Language Versions

### Node.js
- **Current Version**: 22.22.1 LTS
- **Release Date**: March 5, 2026
- **Support Until**: April 30, 2027
- **Documentation**: [nodejs.org](https://nodejs.org/en/blog/release/v22.22.1)
- **Notes**: 
  - Node.js 22.x entered LTS in October 2024
  - Includes OpenSSL 3.5.2 for extended support
  - Recommended for production use

### TypeScript
- **Current Version**: 6.0
- **Release Date**: March 23, 2026
- **Documentation**: [TypeScript 6.0 Announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0)
- **Notes**:
  - Last release based on JavaScript codebase
  - TypeScript 7.0 will be rewritten in Go
  - Breaking changes: strict mode not enabled by default
  - Must manually specify type packages (automatic discovery disabled)

## AWS SDK for JavaScript v3

### Current Version
- **Version**: 3.1019.0
- **Release Date**: March 27, 2026
- **Repository**: [aws/aws-sdk-js-v3](https://github.com/aws/aws-sdk-js-v3)

### Package Versions (All at 3.1019.0)
```json
{
  "@aws-sdk/client-bedrock-runtime": "^3.1019.0",
  "@aws-sdk/client-dynamodb": "^3.1019.0",
  "@aws-sdk/lib-dynamodb": "^3.1019.0",
  "@aws-sdk/client-s3": "^3.1019.0",
  "@aws-sdk/s3-request-presigner": "^3.1019.0",
  "@aws-sdk/client-sfn": "^3.1019.0"
}
```

### Recent Updates (March 2026)
- **3.1019.0** (March 27): Added Bedrock AgentCore Code Interpreter Node.js Runtime Support
- **3.1018.0** (March 26): CloudWatch Logs parameter support for saved queries
- **3.1017.0** (March 25): Variable Payments APIs for AWS Marketplace
- **3.1016.0** (March 24): AWS PCS custom slurmdbd configuration support

### Important Notes
- AWS SDK v2 reached end-of-support on September 8, 2025
- v3 has been GA since December 2020
- All new projects should use v3
- Node.js 16.x support dropped as of January 6, 2025

## TypeScript Configuration

### Recommended tsconfig.json for Node.js 22
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "lib": ["ES2023"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Module Option Clarification
- **ES2023**: Not a valid module option in TypeScript 6.0
- **Valid options**: none, commonjs, amd, system, umd, es6, es2015, es2020, es2022, esnext, node16, node18, node20, nodenext, preserve
- **Recommended for Node.js**: `ESNext` or `NodeNext`
- **Recommended for bundlers**: `ESNext` or `preserve`

## Development Dependencies

### Current Versions
```json
{
  "typescript": "^6.0.0",
  "@types/node": "^22.0.0",
  "@types/aws-lambda": "^8.10.145",
  "esbuild": "^0.24.0",
  "fast-check": "^3.22.0"
}
```

## Amazon Bedrock

### Claude 3.5 Haiku
- **Model ID**: `anthropic.claude-3-5-haiku-20241022-v1:0`
- **Region**: us-east-1
- **API Version**: bedrock-2023-05-31
- **Max Tokens**: 4096 (recommended)
- **Capabilities**: Vision support for image analysis

### Request Format
```typescript
{
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 4096,
  messages: [...]
}
```

## AWS Lambda

### Runtime
- **Runtime**: nodejs22.x
- **Architecture**: arm64 (recommended for cost/performance)
- **Memory**: 512 MB (default for this project)
- **Timeout**: 90 seconds
- **Region**: us-east-1

## Version Update Strategy

### When to Update
1. **Security patches**: Update immediately
2. **Minor versions**: Update monthly during maintenance windows
3. **Major versions**: Plan migration, test thoroughly

### Update Commands
```bash
# Check for outdated packages
npm outdated

# Update to latest within semver range
npm update

# Update to latest major versions (careful!)
npm install @aws-sdk/client-bedrock-runtime@latest
```

### Testing After Updates
1. Run TypeScript compilation: `npm run build`
2. Run unit tests: `npm test`
3. Run integration tests with AWS services
4. Verify Bedrock API compatibility
5. Check Lambda deployment package size

## Breaking Changes to Watch

### TypeScript 6.0
- Strict mode must be explicitly enabled
- Type package discovery disabled (must specify in tsconfig)
- Function expression type-checking adjustments

### AWS SDK v3
- No breaking changes in recent releases
- Consistent API across all 3.x versions
- Modular architecture maintained

## Documentation Links

### Official Documentation
- [Node.js Documentation](https://nodejs.org/docs/latest-v22.x/api/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS Lambda Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)

### Release Notes
- [Node.js Releases](https://nodejs.org/en/blog/release/)
- [TypeScript Releases](https://devblogs.microsoft.com/typescript/)
- [AWS SDK Releases](https://github.com/aws/aws-sdk-js-v3/releases)

## Version Verification Commands

```bash
# Check Node.js version
node --version  # Should show v22.22.1 or later

# Check npm version
npm --version

# Check TypeScript version
npx tsc --version  # Should show 6.0.x

# Check installed package versions
npm list @aws-sdk/client-bedrock-runtime
npm list typescript

# Verify all dependencies
npm list --depth=0
```

## Compatibility Matrix

| Component | Version | Compatible With | Notes |
|-----------|---------|-----------------|-------|
| Node.js | 22.22.1 LTS | AWS Lambda nodejs22.x | Supported until April 2027 |
| TypeScript | 6.0 | Node.js 22.x | Last JS-based release |
| AWS SDK v3 | 3.1019.0 | Node.js 18+ | Requires Node.js 18 minimum |
| Bedrock API | 2023-05-31 | Claude 3.5 Haiku | Stable API version |
| esbuild | 0.24.0 | TypeScript 6.0 | Fast bundler |

## Migration Notes

### From Previous Versions
If upgrading from earlier versions:

1. **AWS SDK 3.775.0 → 3.1019.0**
   - No breaking changes
   - New features available (AgentCore, CloudWatch parameters)
   - Update all AWS packages together

2. **TypeScript 5.x → 6.0**
   - Review strict mode settings
   - Verify type package imports
   - Test function expression type inference
   - Module option changed from "ES2023" to "ESNext"

3. **Node.js 20.x → 22.x**
   - No breaking changes for this project
   - Better performance
   - Extended LTS support

## Last Updated
- **Date**: March 28, 2026
- **Verified By**: Kiro AI Assistant
- **Next Review**: April 28, 2026
