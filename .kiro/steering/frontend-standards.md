# Frontend Standards & Page Specifications

## Design System
- Framework: React 18 + Vite
- Styling: Tailwind CSS utility classes only
- Font:
  - Heading: DM Serif Display
  - Body: DM Sans
- Colors:
  - --color-primary: #1a1a2e
  - --color-accent: #f59e0b
  - --color-bg: #f8fafc
  - --color-text: #1e293b
  - --color-danger: #dc2626
  - --color-warning: #eab308
  - --color-success: #16a34a
- Mobile-first design target: 375px minimum width
- Use generous whitespace
- Use smooth fade-in card animation with stagger

## Screen 1 — Upload Page
- App name: `WITNESS`
- Tagline: `Know your rights. Document violations. Take action.`
- Large camera capture button
  - Use: `<input type="file" accept="image/*" capture="environment">`
- Drag-and-drop upload zone for desktop
- Photo preview thumbnail after selection
- Address input placeholder:
  - `123 Turner St, Blacksburg, VA`
- Jurisdiction dropdown:
  - `Blacksburg, VA`
  - `Montgomery County, VA`
- Analyze button:
  - disabled until photo selected
  - spinner while loading
- Footer disclaimer:
  - `Documentation assistance only. Not legal advice.`

## Screen 2 — Processing Page
- Show uploaded photo preview at top
- Header:
  - `Analyzing your documentation...`
- 4 stage indicators:
  1. `Inspecting photo...`
  2. `Matching building codes...`
  3. `Generating complaint letter...`
  4. `Finding enforcement contacts...`
- Each stage should visually transition:
  - pending
  - loading
  - completed
- Show progress bar
- Show:
  - `Estimated time: ~15-20 seconds`
- Include cancel button back to upload screen

## Screen 3 — Results Dashboard

### Section A — Summary Card
- Header:
  - `X Potential Violations Found`
- Show overall confidence
- Show property address
- Show date

### Section B — Violation Cards
Each card should include:
- severity color dot
- code citation badge
- title
- observed condition text
- plain-English explanation
- confidence bar
- expandable full code text
- expandable relevant Virginia law if applicable

### Section C — Complaint Letter
- Header:
  - `Your Complaint Letter`
- Scrollable full letter display
- `Copy to Clipboard` button
- `Download as PDF` button

### Section D — How to File
- Header:
  - `Ready to file? Here's how:`

#### Step 1
- `Copy and paste into the online form`
- URL: `tobweb.org/ayr/`
- Label: `Town of Blacksburg`
- Button: `Copy Complaint to Clipboard`

#### Step 2
- `Print and deliver in person`
- Address:
  - `300 South Main St, Blacksburg, VA 24060`
- Button: `Download as PDF`

#### Step 3
- `Call and read over the phone`
- Code Inspector:
  - `(540) 443-1612`
- Planning & Building:
  - `(540) 443-1300`
- Hours:
  - `Mon-Fri 8:00 AM - 5:00 PM`

#### Outside Blacksburg
- Montgomery County:
  - `(540) 382-6120 ext. 160`

#### Escalation
- Virginia DHCD:
  - `(804) 371-7150`
  - `dhcd.virginia.gov`

### Section E — Evidence Log
- date and time of documentation
- GPS coordinates if available
- photo reference key
- line:
  - `This evidence log was generated at [timestamp]`

### Section F — Footer
- Disclaimer:
  - `This tool provides documentation assistance only. It does not constitute legal advice. Consult a qualified attorney for legal guidance.`
- `Analyze Another Photo` button

## Component Guidelines
- All interactive elements must have aria-labels
- All async actions must have loading states
- All failures must show user-friendly error messages
- Validate image types:
  - jpg
  - png
  - webp
- Max image size: 10MB
- No stack traces shown to users
- No console.log in production