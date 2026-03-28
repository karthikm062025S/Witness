# WITNESS — Devpost Demo Video Script
## Total Runtime: ~2 minutes 30 seconds

---

## SECTION 1 — HOOK
### [15 seconds]

[SCREEN: Black screen. WITNESS logo fades in — Cormorant Garamond serif, warm cream on near-black. The logo text sweeps a slow golden shine animation.]

"There are 44 million renter households in the United States. HUD estimates that only one in ten housing violations ever gets formally reported.

In Blacksburg, Virginia — where roughly 30,000 Virginia Tech students rent off-campus — the number is even lower. Not because tenants don't care. Because they don't know what to say."

---

## SECTION 2 — THE PROBLEM
### [20 seconds]

[SCREEN: Slide to show a blank complaint form text box with a blinking cursor — empty. Then show a handwritten note that just says "I have mold." Cut to a side-by-side: that note versus a formal complaint header reading "Violation of VMC § 305.1 — Interior Condition — General, with timestamped photographic evidence."]

"Code enforcement agencies rank complaints by specificity. 'I have mold' gets buried. 'Violation of VMC § 305.1 — Interior Condition — with timestamped photographic evidence' gets an inspector at the door.

The gap is not ambition. The gap is legal literacy. Most tenants have the evidence. They just don't have the language. That's what we built WITNESS to solve."

---

## SECTION 3 — LIVE DEMO
### [75 seconds]

[SCREEN: index.html — the WITNESS landing page. Dark background #15110D, the WITNESS wordmark in the navbar with its slow gold-sweep animation, tagline below: "Know your rights. Document violations. Take action."]

"This is WITNESS. A tenant photographs something wrong in their apartment. The app does the rest."

[SCREEN: Scroll down to the upload zone. A large camera-capture button in the center of the page. Address input field below it with placeholder '123 Turner St, Blacksburg, VA'. A jurisdiction dropdown showing 'Blacksburg, VA' selected.]

"Today we're using our electrical hazard demo photo — exposed wiring, a missing cover plate. I enter the property address, select Blacksburg as the jurisdiction, and hit Analyze."

[SCREEN: Click the Analyze button. Browser navigates to loading.html. The uploaded photo appears full-screen behind everything, desaturated and dimmed at 42% opacity. A radial vignette darkens the edges. Then the WebGL scan animation ignites — a 3D grid projected onto the photo geometry in real-time GLSL, scanning lines sweeping across the image from top to bottom in amber and cream. A percentage counter in the left sidebar climbs from 0 to 100.]

"The loading screen isn't a spinner. It's a real-time WebGL grid scan — a custom GLSL shader projecting a 3D analysis grid directly onto the photo. The sidebar counter climbs to 100 percent scanned as Stage 1 runs."

[SCREEN: The grid fades. A second animation appears — a match visual with code chip tokens sliding into a grid. The stage eyebrow reads 'Stage 2 of 2 — Matching housing codes.']

"When Stage 1 finishes, the UI transitions to Stage 2 — matching the observations to the real Virginia housing code database. Code chips visually slot into place on screen."

[SCREEN: Browser navigates to results.html. The results page loads with a dark surface theme. At the top: '3 Potential Violations Found' in large serif type. Below it, violation cards appear with staggered fade-in animations.]

"Results. Three verified violations — all backed by the actual Virginia Maintenance Code."

[SCREEN: Zoom into first violation card. A rust-colored severity dot. A badge reading 'VMC § 604.3'. Title: 'Electrical System Hazards'. Below: 'Dangerous wiring or damaged electrical conditions have to be fixed.' A confidence bar set to 'high'.]

"VMC § 604.3 — Electrical System Hazards. VMC § 604.1 — Electrical System. VMC § 605.1 — Electrical Components. Every code section pulled directly from our DynamoDB housing codes database. Every citation verified before it ever reaches the user."

[SCREEN: Scroll down to the complaint letter section. A styled letter renders with a left-border rust stripe on the violation list. The letter is addressed to the Town of Blacksburg Code Enforcement with the property address, date, and specific code citations embedded in the body.]

"Below the violation cards: a complete, formal complaint letter — ready to copy or download. Addressed to the correct local authority, with the specific code sections cited, the observed conditions described, and a request for inspection."

[SCREEN: Scroll to the How to File section. Contact cards appear: 'Town of Blacksburg Online Request Form — tobweb.org/ayr/', then a phone card: 'Blacksburg Code Inspector — (540) 443-1612 — Mon-Fri 8 AM to 5 PM', and another: 'Blacksburg Planning and Building — (540) 443-1300'.]

"The app tells you exactly what to do with this letter. File online at tobweb.org/ayr. Call the code inspector at (540) 443-1612. Drop it off in person at 300 South Main Street, Blacksburg. Or, if local enforcement doesn't respond, escalate to the Virginia Department of Housing and Community Development at (804) 371-7150.

Every contact is real. Every code section is verified. Copy to clipboard or download as a text file — ready to file in under 20 seconds from photo to complaint."

---

## SECTION 4 — HOW WE BUILT IT
### [30 seconds]

[SCREEN: Architecture diagram — API Gateway → Orchestrator Lambda → Step Functions Express Workflow → Stage1 → Stage2 → Stage3 → DynamoDB → Bedrock → S3]

"The backend is entirely serverless AWS. API Gateway HTTP API routes two endpoints: POST /get-upload-url and POST /analyze. Photos go directly to S3 via a 15-minute pre-signed PUT URL — the Lambda never touches the binary.

The analyze call hits the Orchestrator Lambda, which fires an AWS Step Functions Express Workflow — synchronous, so we get the result in a single HTTP response. The workflow chains three Lambdas: Stage 1 calls Amazon Bedrock Claude Haiku 4.5 with vision to describe what's physically visible in the photo. Stage 2 queries DynamoDB for relevant housing code sections, then calls Bedrock again with both the observations and the real code entries to identify matches. Stage 3 queries DynamoDB for jurisdiction-specific enforcement contacts and calls Bedrock to generate the formal letter.

The critical differentiator is Stage 2's anti-hallucination filter. After Bedrock returns its suggested code citations, the code in stage2-matching.ts runs every single citation through a verification check against the DynamoDB query results — if Bedrock invents a code number that isn't in the database, that violation is filtered out before it ever reaches the user. ChatGPT will confidently cite a code section that doesn't exist. WITNESS cannot."

---

## SECTION 5 — HOW WE USED KIRO
### [15 seconds]

[SCREEN: The .kiro/ directory tree open in an editor. Folders: steering/, specs/, hooks/.]

"We built WITNESS spec-first with Kiro. The .kiro/steering/ directory holds nine context files — product.md, tech.md, aws-services.md, ai-pipeline.md, frontend-standards.md, api-reference.md, security.md, structure.md — always-included context that kept Kiro grounded in our exact architecture across every single session.

We used Kiro's spec system for the backend API: a requirements.md that defined 12 requirements and acceptance criteria, a design.md with the full architecture diagram, and a tasks.md with 17 implementation tasks in dependency order — including the anti-hallucination requirement written as a formal acceptance criterion before a line of code existed.

We also set up two automation hooks in .kiro/hooks/hooks.json: an auto-commit hook that fires on every TypeScript file edit, and a TypeScript type-check hook that runs tsc --noEmit and surfaces the first 20 errors immediately after any save. Kiro wrote code that stayed within the guardrails because the guardrails were written into the project before Kiro started."

---

## SECTION 6 — WHY IT MATTERS
### [15 seconds]

[SCREEN: WITNESS homepage again. The golden shine sweeps across the logo. Tagline: "Know your rights. Document violations. Take action."]

"We built this for Blacksburg. But the architecture is modular — swap the DynamoDB seed data and you can deploy this for any jurisdiction in Virginia, or any state with a housing maintenance code. The database drives everything. The pipeline doesn't change.

44 million renters. One in ten violations reported. The problem isn't evidence — it's the gap between what tenants see and what the system understands.

WITNESS. Know your rights. Document violations. Take action."

---

*Script Notes:*
- *Total estimated runtime: ~2 minutes 25 seconds at a measured speaking pace*
- *Keep the demo recording at the actual app — no mockups or slides for the demo section*
- *The loading.html WebGL animation is the most visually striking moment — let it breathe for 3-4 seconds before narrating*
- *For the results page, zoom in enough that the VMC § badge text is clearly legible*
- *The copy button animation (text changes to "Copied!") is a nice detail — demonstrate it*
