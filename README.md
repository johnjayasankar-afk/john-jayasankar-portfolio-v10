# John Jayasankar — Systems Core Portfolio

Production portfolio for **johnjayasankar.com**.

## Design concept
A bespoke digital product exhibition built around John's actual work in production AI agents and financial infrastructure. The recurring visual grammar is the **Systems Core**:

`WORKFLOW → CONTEXT → JUDGMENT → TOOLS → BOUNDED ACTION → CONTROL → VALUE`

The seven selected systems each use a different explanatory artifact rather than a repeated card treatment:

1. Production Operations AI Agent / I-Port — Orchestration Core
2. AI Incident Investigation Agent / QT CoCo — Evidence Constellation
3. AgentFit — Decision Surface
4. Cross-Currency Compression — Compression Knot
5. Valuation & Validation Engine — Reconciliation Prism
6. FX Forward & NDF Compression — FX Routing Lattice
7. Pre-Trade Margin Simulator — Capital Landscape

AI Platform & Controls is presented separately as the architecture thesis under **How I Build**.

## Stack
This repository intentionally remains dependency-free static HTML/CSS/JS. The original site architecture was static, so the redesign keeps that production simplicity rather than introducing a framework solely for visual effects. 3D depth, optical material behavior, system diagrams, pointer inspection, and scroll-linked motion are implemented with CSS transforms, SVG, and small custom JavaScript modules.

## Files
- `index.html` — portfolio
- `agentfit.html` — standalone AgentFit workbench (`/agentfit` on Vercel)
- `studio.css` — complete visual/material/responsive system
- `studio.js` — interaction, scroll, material and Systems Core behavior
- `script.js` — case-study/deep-link behavior and homepage AgentFit model
- `agentfit.js` — standalone AgentFit model
- `assets/` — resume, portrait, favicon and social preview
- `vercel.json` — clean URLs, caching and security headers

## Deploy
The site is configured for the existing Vercel project and custom domain `johnjayasankar.com`.

Recommended workflow:
1. Commit to a preview branch.
2. Let Vercel create a Preview Deployment.
3. Test desktop, laptop, mobile, project modals, AgentFit, resume and outbound links.
4. Merge to `main` to promote to the production domain.

Vercel `cleanUrls` makes `agentfit.html` available as `/agentfit`.

## Motion / accessibility
- One requestAnimationFrame pointer loop drives the shared pointer-as-light and velocity-aware material response.
- The Systems Core and all seven artifacts use named, deterministic interaction states; Escape returns every instrument to rest.
- `prefers-reduced-motion` disables decorative transforms and animations, and offscreen instruments pause their active sequence.
- Touch layouts support tap/select and controlled drag without depending on hover or blocking vertical page scroll.
- Semantic headings, labels, buttons, links, skip navigation, visible focus and keyboard action parity are preserved.

## Source-of-truth policy
Employer work is intentionally generalized. Do not add implementation details, metrics, technologies, customers or claims that are not already supported by John's approved portfolio/resume.
