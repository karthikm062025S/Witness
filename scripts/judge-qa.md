# WITNESS — Judge Q&A Preparation
## 20 Questions, Confident Specific Answers

---

## CATEGORY 1 — TECHNICAL ARCHITECTURE

### Q1: What AWS services did you use and why?

"We use six AWS services, all in us-east-1, all configured in our .kiro/steering/aws-services.md steering file.

**S3** — bucket named `witness-photos-hackathon`, under an `uploads/` prefix. Photos go directly from the browser to S3 via a pre-signed PUT URL with a 300-second expiry. The Lambda never handles the image binary, which keeps it fast and under the 6 MB API Gateway payload limit.

**API Gateway HTTP API** — two routes: POST /get-upload-url and POST /analyze. We chose HTTP API over REST API because it's cheaper and has lower latency for straightforward proxy integrations.

**Lambda** — five functions, all TypeScript on Node.js 22.x, arm64 architecture, 512 MB memory, 90-second timeout. Two are API Gateway handlers that parse event.body and return CORS headers. Three are Step Functions tasks that receive direct input and return plain objects — a deliberate architectural separation.

**Step Functions Express Workflow** — synchronous, so the orchestrator Lambda gets the full pipeline result in a single StartSyncExecution call. The state machine definition is in infra/step-functions-definition.json and chains Stage1Vision → Stage2Matching → Stage3Complaint. Each stage has a retry policy: two attempts with 2-second intervals and 2x backoff.

**DynamoDB** — two tables on-demand capacity. HousingCodes: partition key `category`, sort key `code_section` — 22 Virginia housing code entries seeded from data/housing-codes.json. EnforcementContacts: partition key `jurisdiction`, sort key `contact_type` — entries for Blacksburg, Montgomery County, and Virginia state escalation.

**Amazon Bedrock** — model ID `us.anthropic.claude-haiku-4-5-20251001-v1:0`. All three stages call Bedrock. Stage 1 uses the vision API with base64-encoded image input. Stages 2 and 3 use text-only calls. The Bedrock client is a shared utility in src/backend/utils/bedrock-client.ts."

---

### Q2: How does the AI pipeline work end-to-end?

"The pipeline starts when the user clicks Analyze. Here's the exact sequence:

1. The frontend posts to POST /analyze on API Gateway with `{ photoKey, address, jurisdiction }`.
2. API Gateway invokes the orchestrator Lambda (src/backend/lambdas/orchestrator.ts).
3. The orchestrator calls Step Functions StartSyncExecutionCommand with the photo key, address, and jurisdiction as JSON input.
4. Step Functions invokes Stage 1 — stage1-vision.ts. This Lambda retrieves the photo from S3 with a GetObjectCommand, converts the stream to a base64 string, then calls callBedrockWithImage() from our bedrock-client utility. The prompt instructs the model to describe only what is physically visible — no diagnoses, no legal conclusions. The output is an array of observations, each with a description, a category (structural, electrical, plumbing, environmental, fire_safety, pest, or heating), and a confidence level (high, medium, or low).
5. Stage 1's output becomes Stage 2's input. Stage 2 — stage2-matching.ts — extracts the unique observation categories, queries DynamoDB for every housing code entry in those categories, then sends the observations and code entries to Bedrock with a text prompt asking it to identify matches. Bedrock returns suggested violations. Stage 2 then runs the anti-hallucination filter.
6. Stage 2's verified violations become Stage 3's input. Stage 3 — stage3-complaint.ts — queries DynamoDB for enforcement contacts for the requested jurisdiction (and also pulls the Virginia state escalation contact), then calls Bedrock to generate the formal complaint letter. The output includes the letter text, an evidence log with timestamp and photo key, and the contact list.
7. Step Functions returns the Stage 3 output to the orchestrator, which wraps it in a 200 response with CORS headers.
8. The frontend receives the full pipeline result, stores it in localStorage, and navigates to results.html."

---

### Q3: Why Step Functions instead of one Lambda?

"Three reasons.

First, observability. Step Functions gives us a visual execution graph in the AWS console. For a hackathon where we're debugging live, being able to see which stage failed and what the input and output were at each state is worth more than the overhead of configuring the state machine.

Second, the Express Workflow type gives us synchronous execution — StartSyncExecutionCommand blocks until the workflow completes and returns the output directly. That means the orchestrator Lambda doesn't need to poll or manage state. The whole pipeline looks like a single function call from the outside.

Third, retry logic at the orchestration layer, not inside Lambda code. Each state in infra/step-functions-definition.json has a Retry block: ErrorEquals States.TaskFailed, IntervalSeconds 2, MaxAttempts 2, BackoffRate 2.0. If Stage 2 has a transient DynamoDB error, Step Functions handles the retry automatically without any retry code in the Lambda itself. That separation keeps each Lambda focused on its single responsibility."

---

### Q4: How do you prevent AI hallucinations?

"This is the core technical differentiator of WITNESS. The anti-hallucination mechanism is in stage2-matching.ts, lines 113 through 124.

Here's exactly what happens. Bedrock returns an array of suggested violations. Each violation includes a `code_display` field — the human-readable citation like 'VMC § 604.3'. Before any of those violations leave Stage 2, every single one is checked against the DynamoDB query results that were retrieved at the start of Stage 2.

The filter is a JavaScript Array.filter with a .some() lookup:
```
const verifiedViolations = aiViolations.filter(violation => {
  const isVerified = codeEntries.some(
    entry => entry.code_display === violation.code_display
  );
  if (!isVerified) {
    console.warn(`Filtered out hallucinated citation: ${violation.code_display}`);
  }
  return isVerified;
});
```

If Bedrock invents a citation — say, 'VMC § 999.9' — that string won't match any entry in the codeEntries array, so the violation is logged as hallucinated and dropped. The user never sees it.

This means WITNESS can only output citations that exist in our actual database. ChatGPT in a browser can confidently cite a housing code section that was never written. WITNESS cannot. The Stage 2 prompt also reinforces this: 'Only cite codes that appear in the provided housing code sections. Do NOT invent code numbers.' But we don't trust the prompt alone — the filter is the enforcement mechanism.

Additionally, the Stage 1 prompt is carefully scoped to observable facts only: 'You are a housing condition analyst. Describe what you physically observe. Do NOT diagnose problems or make legal conclusions.' This keeps Stage 1 from making legal jumps, and Stage 2 can only connect observations to codes that the database already contains."

---

### Q5: What model did you use and why Claude Haiku 4.5?

"Model ID: `us.anthropic.claude-haiku-4-5-20251001-v1:0`. This is Claude Haiku 4.5, released October 15, 2025, accessed via Amazon Bedrock with the inference profile prefix.

We chose it for three reasons specific to our pipeline.

Vision capability. Stage 1 needs a multimodal model that can take a base64-encoded image and produce structured JSON observations. Haiku 4.5 supports the exact message format we use — an image block with type 'base64', media_type 'image/jpeg', and a data field containing the raw base64 string without a data URI prefix. We confirmed this works against real photos including exposed wiring, mold, and water damage.

Speed. Haiku 4.5 is optimized for low latency. Our three-stage pipeline runs in roughly 15-20 seconds end-to-end, which is fast enough for a demo that doesn't feel like waiting. A frontier model would push that toward a minute.

Cost. For a hackathon budget, Haiku 4.5 is dramatically more economical than Sonnet or Opus for our use case. The prompts are well-structured and our context windows are moderate — typically under 4,000 tokens per call. We set max_tokens to 4096 in the Bedrock request body.

We use the same model for all three stages but with different prompt structures — vision-enabled for Stage 1, text-only for Stages 2 and 3. The bedrock-client.ts utility has two separate functions: callBedrockWithImage for Stage 1 and callBedrock for Stages 2 and 3."

---

## CATEGORY 2 — KIRO USAGE

### Q6: How specifically did you use Kiro?

"Kiro was used across three distinct modes: steering files for persistent context, a spec for the backend API, and hooks for automation.

The steering directory at .kiro/steering/ has nine markdown files that are always-included context — meaning Kiro reads them at the start of every session. These files define the exact Bedrock model ID, the exact DynamoDB table schema, the exact Lambda architecture, and even a list of ten common mistakes to prevent (like using @aws-sdk/client-bedrock instead of @aws-sdk/client-bedrock-runtime). With this context, Kiro never made those mistakes in generated code.

The spec at .kiro/specs/witness-backend-api/ follows Kiro's requirements-first workflow — requirements.md defined 12 formal requirements with acceptance criteria written in the 'WHEN/THEN/IF' format, design.md contained the full architecture diagram and data models, and tasks.md had 17 implementation tasks in dependency order. Kiro implemented the backend Lambdas against this spec, and the tasks checkboxes tracked completion.

We also have two additional specs: email-complaint-sender for the mailto link feature, and network-error-bugfix for diagnosing and fixing the API connectivity issues during development.

Hooks automated two things: an auto-commit on every TypeScript file save, and a TypeScript type-check that ran tsc --noEmit and reported the first 20 errors immediately after any edit."

---

### Q7: What are steering files and how did you use them?

"Steering files are markdown documents in .kiro/steering/ that Kiro reads as persistent context at the start of every session. Unlike instructions inside a single prompt, steering files survive across sessions — they're always present, always in scope.

In WITNESS we have nine steering files, each with a specific responsibility:

- **product.md** — defines what the app does, the target user (Virginia tenants, initially Blacksburg), the core value proposition, and the required disclaimer text that must appear in every output.
- **tech.md** — the full stack with exact versions: Node.js 22.x, arm64, 512 MB, 90-second timeout, DynamoDB table schemas, S3 bucket prefix conventions.
- **aws-services.md** — per-service configuration: S3 bucket name `witness-photos-hackathon`, DynamoDB table names HousingCodes and EnforcementContacts, Bedrock model ID.
- **api-reference.md** — the most important one. Contains the exact TypeScript SDK code patterns for Bedrock, DynamoDB, S3, and Step Functions — no assumptions, labeled 'CRITICAL: Common Kiro Mistakes to Prevent' with ten specific anti-patterns.
- **ai-pipeline.md** — the three-stage pipeline flow, input/output formats for each stage, and the anti-hallucination principle.
- **frontend-standards.md** — design tokens, font choices (Cormorant Garamond + DM Sans), color palette, and the exact screen specifications including real phone numbers and URLs.
- **security.md** — upload validation rules (jpeg, png, webp, max 10 MB), IAM role requirements, the exact disclaimer text.
- **structure.md** — the directory layout and the critical convention about which Lambdas parse event.body and which don't.
- **..md** — the top-level steering file with inclusion mode set to 'always'.

The result: Kiro generated code that matched our architecture consistently, session after session, without needing to be reminded of the conventions."

---

### Q8: How did spec-driven development help?

"Spec-driven development with Kiro forced us to make architectural decisions before writing code — and that upfront clarity eliminated an entire class of bugs.

The requirements.md for the backend API has 12 requirements, each with acceptance criteria written in formal WHEN/THEN/IF language. Requirement 3 — Virginia Code Matching with Anti-Hallucination Verification — has this specific criterion: 'THE Code_Matcher SHALL verify each cited code_display value exists in the HousingCodes_Table query results' and 'IF a violation cites a code_display not found in the database results, THEN THE Code_Matcher SHALL exclude that violation from the output.'

That requirement existed as a written spec before Kiro wrote a single line of stage2-matching.ts. When Kiro implemented the Lambda, it implemented the filter because the filter was a first-class requirement — not an afterthought.

The tasks.md broke the implementation into 17 tasks in explicit dependency order: shared types first, then bedrock client, then each Lambda in pipeline execution order, then infrastructure, then seeding. This meant we never had a situation where a Lambda was implemented before its type definitions existed.

The network-error-bugfix spec is another example. When we hit 'network failed' errors during development, instead of debugging ad-hoc, we wrote a bugfix.md spec that listed the eight possible root causes — missing env vars, wrong CORS config, missing Step Functions ARN, DynamoDB tables not seeded, Bedrock model access not enabled — as formal defect descriptions. Kiro then worked through them systematically."

---

### Q9: What hooks did you set up?

"Two hooks, defined in .kiro/hooks/hooks.json.

The first hook is named 'Auto-commit on save'. It triggers on the fileEdited event, filtered to the pattern src/**/*.ts and src/**/*.tsx. When any TypeScript file in the src directory is saved, it runs: cd /workspace && git add -A && git commit -m 'auto: save progress' --no-verify. This meant we never lost work during a Kiro session — every meaningful code change was automatically committed.

The second hook is named 'TypeScript type check'. Same event type, same file pattern. It runs: npx tsc --noEmit --pretty 2>&1 | head -20. This surfaces TypeScript compile errors immediately after every save, without needing to manually run the type checker. If Kiro generated code with a type error, we saw it within seconds.

Both hooks use hookAction: runCommand. The pattern filter ensures they only fire on TypeScript source files, not on JSON config changes or markdown files.

We also have an MCP server configured in .kiro/settings/mcp.json — the fetch server running via uvx mcp-server-fetch. This gave Kiro access to fetch external URLs, which was useful for cross-referencing AWS documentation during the spec-writing phase."

---

## CATEGORY 3 — PRODUCT & IMPACT

### Q10: Who is your target user?

"The primary user is a Virginia Tech student who rents off-campus housing in Blacksburg or Montgomery County, Virginia. This is a very specific profile: someone who is renting for the first time, doesn't know their tenant rights under Virginia Code Title 55.1, has a real problem in their unit — mold, exposed wiring, broken smoke detectors, pest infestation — but doesn't know the legal language needed to make a complaint that gets taken seriously.

The secondary user profile is any Virginia tenant who needs to escalate to code enforcement. The app supports two jurisdictions out of the box: Blacksburg and Montgomery County. The Virginia state escalation path to DHCD at (804) 371-7150 is always included.

The app is mobile-first with a 375px minimum width target, because the primary use case is taking a photo with your phone in your apartment and filing the complaint immediately. The camera capture input uses type='file' accept='image/*' capture='environment' to open the rear camera directly on mobile."

---

### Q11: Why Blacksburg specifically?

"Three reasons.

First, the team. We're students at Virginia Tech. We know this housing market. We know the difference between a Turner Street apartment and a Montgomery County property. We know that the Blacksburg Code Inspector is at (540) 443-1612 and that you can file online at tobweb.org/ayr/. Real local knowledge is baked into the enforcement contacts database.

Second, jurisdictional specificity is the whole point. Generic tenant rights advice is everywhere — it's on Reddit, it's in AI chatbots. What's missing is jurisdiction-specific, citation-verified, form-ready complaint generation. Starting with one jurisdiction meant we could get the housing code database right. Our DynamoDB HousingCodes table has 22 entries covering Virginia Maintenance Code sections — VMC § 305.1, VMC § 604.1, VMC § 604.3, VMC § 605.1, VMC § 704.6, and more — plus Virginia Code sections under Title 55.1-1220 for landlord duties.

Third, it demonstrates the scalability argument. If we built it generically for 'all of Virginia,' the contacts database would be a spreadsheet and the code database would be incomplete. Starting with Blacksburg and getting it precisely right proves the model. Adding a new jurisdiction means adding rows to DynamoDB — the pipeline code doesn't change."

---

### Q12: How accurate is it?

"There are two types of accuracy worth distinguishing.

Citation accuracy is near-100% by design. The anti-hallucination filter in Stage 2 is a hard constraint: the only code sections that can appear in WITNESS output are the ones that exist verbatim in the DynamoDB HousingCodes table. We seed 22 entries. If the AI tries to cite a 23rd, it gets filtered. The code_display strings — 'VMC § 604.3', 'Va. Code § 55.1-1220(A)(5)' — are pulled directly from the database, not generated by the model. Citation accuracy is structurally enforced.

Match accuracy — the question of whether the right codes are matched to the right photos — depends on Stage 1's vision description and Stage 2's reasoning. We tested with five demo photos: a moldy ceiling, a broken smoke detector, a cockroach infestation, exposed electrical wiring, and water damage. For obvious, high-confidence conditions, the pipeline consistently identifies the correct code categories and sections. For ambiguous photos, the confidence fields — high, medium, low — on each observation and violation are honest signals.

We do not claim the output is legal advice. The disclaimer is on every page and at the end of every generated letter: 'This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance.'"

---

### Q13: What happens if the AI gets it wrong?

"Three layers of protection.

First, the Stage 1 prompt constrains the model to observable facts only: 'Do NOT diagnose problems or make legal conclusions.' A photo of water staining produces 'dark discoloration on ceiling surface, approximately 2 square feet, category: environmental, confidence: high' — not 'this is black mold.' The legal interpretation happens in Stage 2, not Stage 1.

Second, the anti-hallucination filter means the worst case for a citation error is a false negative — a real violation that isn't identified — rather than a false positive where a non-existent code is cited. We can miss a violation. We cannot fabricate one.

Third, every violation card displays confidence: high, medium, or low, and a match_reasoning field that explains why the code was matched to the observation. Users can evaluate the reasoning themselves.

And the disclaimer is non-negotiable. It's in the Stage 3 prompt as a literal required sentence: 'This documentation was generated for informational purposes only. It does not constitute legal advice. Consult a qualified attorney for legal guidance.' The Bedrock client parses the letter and if that sentence is missing, Stage 3 throws. The disclaimer is enforced at the code level, not just the design level."

---

## CATEGORY 4 — SCALABILITY & BUSINESS

### Q14: Can this scale to other jurisdictions?

"Yes, and the architecture was designed for it from day one.

The pipeline code in the three Lambda functions is jurisdiction-agnostic. It receives a `jurisdiction` string as input and uses it only for two DynamoDB queries: one to fetch enforcement contacts in Stage 3, and the jurisdiction field is also stored on each housing code entry. The pipeline logic doesn't know or care whether the jurisdiction is 'blacksburg', 'richmond', or 'chicago'.

Adding a new jurisdiction requires two things: add housing code entries to the DynamoDB HousingCodes table for the relevant municipal or state code sections, and add enforcement contact entries to the EnforcementContacts table. Both are JSON seed files — data/housing-codes.json and data/enforcement-contacts.json — with a seed script at src/backend/scripts/seed-dynamodb.ts that batch-writes them via DynamoDB BatchWriteCommand.

The jurisdiction dropdown in the frontend currently shows 'Blacksburg, VA' and 'Montgomery County, VA'. Adding 'Roanoke, VA' or 'Arlington, VA' means adding the housing code data and the enforcement contacts, then adding an option to the dropdown.

For a production product, the housing code data could come from a third-party legal data API, and the jurisdiction list could be driven dynamically from a DynamoDB scan. The pipeline is ready for that — no code changes required."

---

### Q15: How much does this cost to run?

"For a hackathon demo volume — let's say 100 analyses per day — the cost is minimal.

DynamoDB on-demand: each analysis triggers roughly 7-10 QueryCommand calls across the two tables. At $0.25 per million read request units, 100 analyses per day is a rounding error.

S3: each photo is a single PUT and a single GET per analysis. At $0.023 per GB stored and $0.0004 per 1,000 requests, negligible.

Lambda: five functions, most complete in under a few seconds. 100 analyses per day at 90-second maximum timeout is well within the free tier's 400,000 GB-seconds per month.

Step Functions Express Workflows: $0.00001 per state transition. Each analysis runs 3 states. 100 analyses per day is $0.003 per day.

Bedrock: this is the meaningful cost. Claude Haiku 4.5 at roughly $0.001 per 1,000 input tokens and $0.005 per 1,000 output tokens. Three Bedrock calls per analysis, each with moderate context (under 4,000 tokens input, under 2,000 tokens output). Estimated cost per analysis: $0.02-0.05. At 100 analyses per day: $2-5 per day.

API Gateway HTTP API: $1 per million requests. 100 per day is $0.003 per month.

Total at hackathon scale: under $5-10 per day, dominated by Bedrock. At a real scale of 10,000 analyses per day, Bedrock becomes the line item to optimize — fine-tuning a smaller model on housing code data would substantially reduce cost."

---

### Q16: What's the path to production?

"Three meaningful gaps between the hackathon build and production.

First, authentication and rate limiting. The current API has CORS origin set to '*' and no authentication, which is explicitly noted in security.md as 'hackathon scope only.' Production would add Cognito user pools and API Gateway usage plans with rate limiting.

Second, a richer housing code database. Our 22 DynamoDB entries cover the most common Virginia Maintenance Code sections. A production version would ingest the full VMC, the full Virginia Residential Landlord and Tenant Act, and would be extensible to other states. The architecture already supports this — it's a data problem, not a code problem.

Third, the email/filing integration. We have a full spec written in .kiro/specs/email-complaint-sender/requirements.md for an email sending Lambda. The hackathon implementation uses mailto: links that open the user's default email client. Production would integrate AWS SES for direct submission to enforcement agencies that accept email complaints, with proper SES domain verification and bounce handling.

The frontend is currently three plain HTML files. The tech.md steering file specifies React 18 + Vite + Tailwind, and src/frontend/src/ has the component and page directories ready. Migrating to React would be a UI rebuild, not an API change."

---

### Q17: How is this different from just using ChatGPT?

"Five concrete differences.

One: citation verification. If you paste a photo into ChatGPT and ask 'what housing codes does this violate,' ChatGPT will produce plausible-sounding code citations that may or may not be real. It has no mechanism to verify them against any database. WITNESS filters every citation against a real DynamoDB table before showing it to the user. You cannot get a hallucinated code section out of WITNESS.

Two: jurisdiction-specific enforcement contacts. ChatGPT cannot tell you to call (540) 443-1612 and ask for the Blacksburg Code Inspector between 8 AM and 5 PM, Monday through Friday. It cannot pre-fill a complaint addressed to the Town of Blacksburg Planning and Building Department at 300 South Main Street. WITNESS can, because that data is in the EnforcementContacts table.

Three: structured output. WITNESS returns typed JSON with observations, violations, complaint_letter, evidence_log, and contacts. This is frontend-renderable, downloadable, and portable. ChatGPT returns prose.

Four: evidence log. WITNESS generates an evidence_log object with a timestamp, the property address, and the photo_reference key in S3. This is documented provenance for the submission. ChatGPT doesn't timestamp or store anything.

Five: the disclaimer is structurally enforced. The Stage 3 prompt requires the exact disclaimer sentence at the end of every letter. This is a legal and ethical requirement that ChatGPT doesn't enforce automatically."

---

## CATEGORY 5 — TECHNICAL DEPTH

### Q18: Walk me through Stage 2 code matching in detail.

"Stage 2 is the most technically interesting Lambda. Let me walk through stage2-matching.ts line by line.

The handler receives the Stage 1 output: an observations array, plus photoKey, address, and jurisdiction passed through from the original request.

Step one: extract unique categories. Each observation has a category field — one of structural, electrical, plumbing, environmental, fire_safety, pest, or heating. We use a Set to deduplicate: `const categories = [...new Set(observations.map(o => o.category))]`. If a photo has two electrical observations and one structural, we get two categories.

Step two: query DynamoDB. For each unique category, we run a QueryCommand against the HousingCodes table with KeyConditionExpression 'category = :cat'. This is why category is the partition key — it enables efficient range queries by violation type. For an electrical photo we'd retrieve VMC § 604.1, VMC § 604.3, and VMC § 605.1. All retrieved entries accumulate into the codeEntries array.

Step three: call Bedrock. We pass both the observations array and the codeEntries array into the STAGE2_PROMPT template via our callBedrock utility in bedrock-client.ts. The prompt uses {observations_json} and {dynamodb_results_json} as placeholders — the utility does string replacement, serializing the objects to JSON. The prompt explicitly instructs: 'Only cite codes that appear in the provided housing code sections. Do NOT invent code numbers.'

Step four: the anti-hallucination filter. This is lines 113-124. `aiViolations.filter(violation => codeEntries.some(entry => entry.code_display === violation.code_display))`. The comparison is a strict equality check on the code_display string. If Bedrock returns 'VMC § 604.3' and 'VMC § 604.3' exists in codeEntries, it passes. If Bedrock returns 'VMC § 604.9' and that string doesn't exist anywhere in codeEntries, it's logged as hallucinated and dropped.

Step five: return the verified violations along with the original observations, photoKey, address, and jurisdiction — everything Stage 3 will need."

---

### Q19: What happens if S3 upload fails?

"The upload flow has two distinct failure modes.

The first is a failure to generate the pre-signed URL. That happens in get-upload-url.ts, the API Gateway Lambda. If the S3 client throws during getSignedUrl, the Lambda catches the error and returns a 500 status with an error message and CORS headers. The frontend displays the error and the user can retry.

The second is a failure during the actual upload from the browser to S3. The frontend does a direct PUT to the pre-signed URL. If that fails — network error, expired URL, wrong content type — the browser-side fetch throws, and the frontend catches it before navigating to loading.html. The user stays on the upload page.

If the upload succeeds but Stage 1 fails to retrieve the photo from S3 — say the key is wrong or the Lambda doesn't have GetObject permission on the bucket — stage1-vision.ts catches the NoSuchKey error specifically: `if (error.message.includes('NoSuchKey'))` and throws a descriptive error: 'Photo not found in S3: [photoKey]'. Step Functions propagates this to the orchestrator, which returns a 500 with the cause field populated. The frontend has a fallback to mock data, configured in frontend/config.js, which uses the MOCK_RESULT constant with a pre-built mold ceiling scenario — so the demo can run without live backend connectivity if needed.

The S3 pre-signed URL has a 300-second expiry. If a user sits on the upload page for more than 5 minutes, the URL expires and the upload will fail with a 403 from S3. The frontend would need to request a new URL — this is a known gap in the hackathon build."

---

### Q20: How does the frontend communicate with the backend?

"The API base URL is defined in frontend/config.js as a single constant: `const API_BASE_URL = 'https://mbqglb3kxc.execute-api.us-east-1.amazonaws.com'`. All three HTML pages load this file as a script tag before their own JavaScript.

The upload flow, in index.html, does two calls. First: POST to API_BASE_URL + '/get-upload-url' with a JSON body. The response is `{ uploadUrl, photoKey }`. Then: a direct PUT to the uploadUrl with the image binary as the request body and Content-Type 'image/jpeg'. This is a browser-to-S3 direct upload — it never touches the Lambda again.

After the upload, index.html stores three values in localStorage: `witnessPhotoKey`, `witnessAddress`, and `witnessJurisdiction`. Then it navigates to loading.html.

Loading.html reads those three values from localStorage and immediately fires the analysis call: POST to API_BASE_URL + '/analyze' with `{ photoKey, address, jurisdiction }` as the JSON body. This call can take 15-20 seconds. The WebGL scan animation and stage progress indicators run concurrently on the client — they're purely cosmetic timers, not tied to actual pipeline stages. When the fetch resolves, the result is stored in localStorage as 'witnessResults' and the browser navigates to results.html.

Results.html reads 'witnessResults' from localStorage on page load and renders the violation cards, complaint letter, and contacts. If 'witnessResults' is null or the parse fails, it falls back to the MOCK_RESULT constant from config.js.

CORS is handled on the API Gateway side: every Lambda response includes Access-Control-Allow-Origin *, Access-Control-Allow-Headers Content-Type, and Access-Control-Allow-Methods POST OPTIONS. The CORS headers utility is in src/backend/utils/cors.ts and is imported by both API Gateway Lambdas — orchestrator.ts and get-upload-url.ts."

---

*Notes for presenters:*
- *For Q4 (anti-hallucination), consider opening stage2-matching.ts on screen and pointing to lines 113-124*
- *For Q18 (Stage 2 detail), the DynamoDB query pattern is also documented verbatim in .kiro/steering/api-reference.md*
- *For Q20 (frontend/backend communication), opening frontend/config.js and showing the single API_BASE_URL constant is a strong visual proof point*
- *If asked about the model version specifically: the bedrock-client.ts file has `const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"` hardcoded on line 7 — open the file*
