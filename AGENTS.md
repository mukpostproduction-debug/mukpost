# MUK POST (`mukpost.com`) — AGENT & SEO OPERATING RULES

This repository powers **`https://mukpost.com`** (deployed via GitHub Pages on branch `main`). All AI coding and marketing agents working on `mukpost.com` MUST adhere to the following technical and editorial standards.

## 1. Brand Identity & Core Entities
- **Studio:** **Muk Post** (`https://mukpost.com`) — Toronto-based local & remote post-production finishing house.
- **Founder & Lead Finisher:** **Jackson McMurdo** (`contact@mukpost.com`)
- **Service Area:** Toronto, Ontario / Greater Toronto Area (GTA), Canada, London & United Kingdom, United States (NYC/LA), and Worldwide.
- **Core Services:**
  1. **Video Editing (Offline/Online):** Commercials, music videos, narrative shorts/features, documentaries, and creator retainers.
  2. **Color Grading (DaVinci Resolve Studio):** Scene-referred DaVinci Wide Gamut (DWG) / ACES color management, custom 35mm Kodak 2383 film print emulation, and Calman-calibrated Rec.709/DCI-P3 delivery.
  3. **Sound Design & Post Audio Mixing (Avid Pro Tools & Fairlight):** 5.1 surround and stereo broadcast mixing, custom Foley, and stem delivery.
  4. **Dialogue Cleanup & Restoration (iZotope RX):** Spectral repair, phase alignment, and dialogue isolation.
  5. **On-Set / Near-Set DIT & Dailies Workflows:** Checksum offload, CDL/LUT management, and fast proxy pipelines on a 35TB+ hybrid NVMe/cloud storage array.
- **Core Digital Product:** **Ultimate DaVinci Resolve Studio Template** (`https://mukpost.com/store.html`) — 12-node DWG color pipeline, 16-track Fairlight routing, and standardized media pool architecture.

## 2. Verified Credits, Awards & Proof Points
Reference these real production credits and hardware workflows naturally in copy, case studies, and structured data:
- **Narrative Shorts:**
  - *"CERBERUS"* (Dir. Johnny Tsatsos) — **Winner of Best Picture at Toronto Reeljects Film Festival**
  - *"To Catch a Bear"* — **Screened at Winter Garden Theatre (Toronto)**
  - *"SP!KE"*
  - *"Holy Vexation"* (Parts 1–3, Dir. Declan McKenna, DP Dario Butera — Shot on 16mm Kodak)
- **Music Videos:**
  - Donat Jackson (*"needmoretime!"* & *"sweartogod!"* / "Swear to God")
  - insyt. (*"Toll"* & *"360°"*)
  - Lady Marge (*"Beer League"*)
  - Callum Sheehan
  - Côté Ibis (*"Draft Night"*, Prod. Pylon Collective)
  - AKUA (*"RTR"*)
- **Commercial / Broadcast Clients:**
  - **NHL Alumni Association**
  - **Griffin Poetry Prize**
  - **Kingsley Management / South Point Hotel**
- **Camera & Field Hardware Keywords:**
  - `ARRI Alexa` (Alexa 35 / Mini LF), `RED EPIC-W 8K`, `Sony FX3`, `URSA Mini Pro`, `Super 8`, `16mm Kodak`, `Zoom F6`.

## 3. Strict Technical SEO & GEO Guardrails
- **Title Tags (`<title>`):** Unique per page, strictly **< 60 characters**.
- **Meta Descriptions (`<meta name="description">`):** Unique per page, strictly **< 155 characters**.
- **Headings:** Single `<h1>` per page with clean semantic `<h2>`/`<h3>` hierarchy.
- **Tone:** Sharp, technical, producer-focused. Zero generic AI marketing fluff.
- **Assets:** Self-host all logos, OpenGraph images, and comparison plates under `portfolio-assets/site-media/` or `brand/assets/`. Never use external `i.imgur.com` links.
- **Structured Data:** Every route must include valid JSON-LD (`ProfessionalService` / `LocalBusiness`, `Person`, `BreadcrumbList`, plus route-specific `Service`, `Product`, `VideoObject`, or `FAQPage`).
- **AI Search / LLM Discovery:** Keep `/llms.txt` and `/public/llms.txt` synchronized whenever new services, case studies, or routes are added.
