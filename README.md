# MUK POST // POST-PRODUCTION & DIGITAL SYSTEMS

<div align="center">

```
  __  __ _   _ _  __  ____   ___  ____ _____ 
 |  \/  | | | | |/ / |  _ \ / _ \/ ___|_   _|
 | |\/| | | | | ' /  | |_) | | | \___ \ | |  
 | |  | | |_| | . \  |  __/| |_| |___) || |  
 |_|  |_|\___/|_|\_\ |_|    \___/|____/ |_|  
```

**Toronto-Based Remote Post-Production Finishing House & Digital Systems**  
*Colour Grading · Fairlight Audio Post · Graphic & Title Design · Post Infrastructure*

[![Website Status](https://img.shields.io/badge/website-mukpost.com-00FF66?style=flat-square&logo=googlechrome&logoColor=black)](https://mukpost.com)
[![Release Version](https://img.shields.io/badge/release-v1.6-white?style=flat-square&logo=github&logoColor=black)](https://github.com/mukpostproduction-debug/mukpost)
[![Pipeline](https://img.shields.io/badge/pipeline-DWG%20%2F%20ACES-00FF66?style=flat-square)](https://mukpost.com/colour)
[![Audio](https://img.shields.io/badge/fairlight-Stem%20Mixing-white?style=flat-square)](https://mukpost.com/sound)
[![License](https://img.shields.io/badge/entity-Muk%20Post%20(Ontario%20Reg.)-blue?style=flat-square)](https://mukpost.com)

[**Live Website**](https://mukpost.com) • [**Colour Gallery**](https://mukpost.com/colour) • [**Sound Stem Mixer**](https://mukpost.com/sound) • [**Design Portfolio**](https://mukpost.com/design) • [**Template Store**](https://mukpost.com/store) • [**Bio Links**](https://mukpost.com/links)

</div>

---

## 🏛️ STUDIO OVERVIEW

**Muk Post** is an independent post-production finishing house and digital systems developer founded by Jackson McMurdo. We specialize in end-to-end commercial and narrative post finishing:

* **Colour Grading**: Advanced scene-referred color grading utilizing DaVinci Wide Gamut (DWG) and ACES color science on Calman-verified ASUS ProArt monitoring.
* **Sound Post & Stem Mixing**: Commercial broadcast audio finishing, multi-track sidechain ducking, noise restoration via iZotope RX 12, and integrated LUFS loudness normalization.
* **Graphic & Title Design**: Bespoke credit sequences, hand-drawn typography, 35mm film still composites, and visual identities for musical artists and directors.
* **Post-Production Infrastructure**: Developer of the industry-standard **Muk Post Resolve Master Template V1**, purpose-built to eliminate workflow friction for freelance finishers and boutique studios.

---

## 🌐 WEB ARCHITECTURE & SITEMAP

The official website is hosted via GitHub Pages on custom domain **`mukpost.com`** with automated SSL enforcement:

| Page | Route | Description | Key Features |
| :--- | :--- | :--- | :--- |
| **Home** | [`/`](https://mukpost.com) | Studio landing page & reel showcase | Before/after interactive grading sliders, film laurels, client showcase, quote inquiry form. |
| **Colour** | [`/colour`](https://mukpost.com/colour) | Digital Intermediate (DI) portfolio | High-resolution gallery stills across four flagship productions, Log vs. Graded lightbox inspection. |
| **Sound** | [`/sound`](https://mukpost.com/sound) | Audio supervision & interactive stem player | Real-time multi-track stem mixer (DX, MX, FX) with solo/mute triggers and scrubbable waveforms (*Cerberus*). |
| **Design** | [`/design`](https://mukpost.com/design) | Graphic, title card, & typography showcase | Split-screen "Design vs. Clean Plate" interactive toggles, looping motion title video (*HEAL*), and single cover art. |
| **Store** | [`/store`](https://mukpost.com/store) | Digital products & workflow tools | Master DaVinci Resolve Template V1 showcase, feature deep-dive, node tree breakdown, and Gumroad checkout. |
| **Links** | [`/links`](https://mukpost.com/links) | Mobile-optimized link-in-bio portal | Fast-loading mobile navigation, featured music video releases, direct booking links, and social channels. |

---

## 📁 REPOSITORY STRUCTURE (v1.6)

```
mukpost/
├── CNAME                                  # Custom domain pointer (mukpost.com)
├── README.md                              # Studio master documentation
├── index.html                             # Homepage (v1.6)
├── colour.html                            # Colour grading portfolio (v1.6)
├── sound.html                             # Sound supervision & interactive mixer (v1.6)
├── design.html                            # Graphic & title design showcase (v1.6)
├── store.html                             # Resolve Master Template product page (v1.6)
├── links.html                             # Social hub & link-in-bio (v1.6)
│
├── design-assets/                         # Organized graphic & title card assets
│   ├── title-cards/                       # Title sequence plates, motion videos, and raw stills
│   │   ├── tc-360-design.jpg              # Insyt 360 designed layout
│   │   ├── tc-360-plate.jpg               # Insyt 360 clean plate
│   │   ├── tc-heal-design.jpg             # HEAL title card still
│   │   ├── tc-heal-plate.jpg              # HEAL clean plate
│   │   ├── tc-heal-video.mp4              # HEAL looping motion sequence
│   │   ├── tc-maze-scene.jpg              # Kai Banks Maze composite
│   │   ├── tc-maze-plate.jpg              # Kai Banks Maze clean subway plate
│   │   ├── tc-maze-type.jpg               # Kai Banks Maze isolated calligraphy
│   │   ├── tc-needmoretime-design.jpg     # Donat Jackson wire layout
│   │   ├── tc-needmoretime-plate.jpg      # Donat Jackson bridge plate
│   │   ├── tc-puppet-strings.jpg          # Insyt Puppet Strings script
│   │   └── Still 2026-07-08*.jpeg         # High-resolution master title stills
│   └── album-art/                         # Single artwork & cover designs
│       ├── art-360.jpg                    # Insyt 360 album art
│       ├── art-needmoretime.jpg           # Donat Jackson needmoretime! cover
│       ├── art-toll.jpg                   # Insyt TOLL cover
│       ├── art-sweartogod.jpg             # Swear to God! cover
│       └── *Large.jpeg                    # Master uncompressed cover files
│
├── stills-insyt360/                       # Project gallery stills: Insyt - "360°"
├── stills-insyttoll/                      # Project gallery stills: Insyt - "TOLL"
├── stills-ladymargebeerlauge/             # Project gallery stills: "Lady Marge Beer Lauge"
├── stills-needmoretime/                   # Project gallery stills: Donat Jackson - "needmoretime!"
│
├── cerberus-dx2.m4a                       # Audio stem: Dialogue layer
├── cerberus-mx2.m4a                       # Audio stem: Music layer
├── cerberus-fx2.m4a                       # Audio stem: Sound effects layer
├── cerberus-mix2.m4a                      # Audio stem: Master reference mix
├── cerberus-web2.mp4                      # Video reference for stem mixer
├── cerberus-waveforms.json                # Waveform rendering metadata
└── MukPost_Template_ProductV1ImageRender.* # Master packaging renders for store
```

---

## ⚡️ DEPLOYMENT & CONTRIBUTION WORKFLOW

This site is statically compiled and served with zero build-step overhead:

1. **Clone the repository**:
   ```bash
   gh repo clone mukpostproduction-debug/mukpost
   ```
2. **Local Preview**:
   Open any `.html` file in your preferred web browser, or run a lightweight local server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```
3. **Commit & Deploy**:
   Every push to the `main` branch automatically triggers GitHub Pages deployment to `mukpost.com`:
   ```bash
   git add -A
   git commit -m "Update site build to v1.6"
   git push origin main
   ```

---

## 📬 BOOKING & INQUIRIES

* **General Inquiries**: [contact@mukpost.com](mailto:contact@mukpost.com)
* **Instagram**: [@muk.post](https://instagram.com/muk.post)
* **X / Twitter**: [@muk_post](https://x.com/muk_post)
* **LinkedIn**: [Muk Post](https://www.linkedin.com/company/muk-post/home/)
* **Headquarters**: Toronto, Ontario, Canada (Remote Worldwide)

---

<div align="center">
  <sub>&copy; 2026 Muk Post. All Rights Reserved. Mastered in DaVinci Resolve Studio & Fairlight.</sub>
</div>
