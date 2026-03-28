# Witness Frontend

Pure HTML/CSS/JavaScript frontend for the Witness housing code violation detection system.

## 🚀 Quick Start

### Start Local Development Server

```bash
cd frontend
node serve.mjs
```

Then open: **http://localhost:3000**

## 📁 File Structure

```
frontend/
├── index.html          # Upload page (main entry point)
├── loading.html        # Processing/analysis page with WebGL scan animation
├── results.html        # Results page with violations, letter, and contacts
├── config.js           # API configuration and mock fallback data
├── serve.mjs           # Local development server
├── package.json        # Dependencies (none required for runtime)
└── README.md           # This file
```

## 🔌 API Integration

The frontend connects to the deployed AWS backend:

**API Base URL:** `https://mbqglb3kxc.execute-api.us-east-1.amazonaws.com`

**Endpoints Used:**
- `POST /get-upload-url` - Get S3 pre-signed upload URL
- `POST /analyze` - Analyze photo and generate report

**Mock Fallback:** If API is unreachable, uses Virginia mock data from `config.js`

## 🧪 Testing Checklist

### Happy Path
1. ✅ Upload a photo with address "123 Turner St, Blacksburg, VA"
2. ✅ Select "Blacksburg, VA" jurisdiction
3. ✅ Verify loading page shows scan animation
4. ✅ Verify results page shows Virginia violations (VMC codes)
5. ✅ Verify complaint letter is readable
6. ✅ Verify contacts show Blacksburg enforcement offices
7. ✅ Test "Copy Letter" button
8. ✅ Test "Download Letter" button

### Error Handling
1. ✅ Upload without address → should show alert
2. ✅ API down → should fall back to mock data
3. ✅ Large photo (>5MB) → should work, no preview

## 📊 Data Sources

**Backend uses:**
- `data/housing-codes.json` - Virginia housing code database (seeded to DynamoDB)
- `data/enforcement-contacts.json` - Enforcement contact info (seeded to DynamoDB)

**Frontend uses:**
- `config.js` MOCK_RESULT - Fallback data when API is unreachable

## 🚨 Known Issues

1. **S3 CORS Required** - Verify S3 bucket has CORS policy allowing PUT from browser
2. **localStorage Limit** - Photos >1-2MB may not preview (gracefully handled)
3. **Cosmetic** - Bottom disclaimer mentions "NYC" instead of "Virginia" (low priority)

## 🔧 No Build Step Required

This is pure HTML/CSS/JS - no bundling, no transpilation, no dependencies.
Just serve the files and it works!
