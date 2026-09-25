# MUK POST // Motion Graphics & Title Elements Production Manual
**Project:** Emlia & John Wedding  
**Location:** Den 1880, Waterloo, ON  
**Target Applications:** DaVinci Resolve 19 Studio (Fusion) & Adobe Premiere Pro  
**Aesthetic Standard:** MUK POST Editorial Architecture  

---

> **[DESIGN ETHOS]:**  
> Motion graphics must reflect **architectural restraint**. Avoid swirling script fonts or digital 3D spins. Typography uses **Syne Bold** for hero titles and **Space Mono** for metadata, paired with 2.39:1 CinemaScope mattes and organic 35mm film gate overlays.

---

## 1. Master Title Cards & Chapter Dividers

| Element | Typography & Hierarchy | Motion & Optical Behavior |
| :--- | :--- | :--- |
| **Master Opening Card** | **Syne Bold** (Tracking +0.25em, All-Caps)<br>Sub: **Space Mono** (+0.18em tracking, 65% Opacity) | 18-frame slow optical dissolve (Gaussian 12px &rarr; 0px) with 102% subtle digital drift over 4.5 seconds. |
| **Chapter Dividers (I–IV)** | **Space Mono Bold** (Warm Amber `#E5B96F`)<br>Location: Den 1880 Historic Library / Main Hall | Left-to-right hairline stroke wipe (15 frames) with 2.5s screen hold over ambient room b-roll. |
| **2.39:1 CinemaScope Matte** | `MUK_POST_239_Cinema_Scope_Matte_4K.png`<br>3840 x 2160 UHD (Solid black 277px top/bottom bars) | Placed on highest video track (V4/V5) across entire film for widescreen theatrical presentation. |

---

## 2. Documentary Lower Thirds Suite (Toasters & VIPs)

### Pre-Built Speaker Hierarchy (Den 1880 Speeches):
- **Speaker 01:** `MICHAEL MORRA // FATHER OF THE BRIDE`
- **Speaker 02:** `JUDY & ROBERT MAGVAS // PARENTS OF THE GROOM`
- **Speaker 03:** `ABIGAIL MORRA // MAID OF HONOR`
- **Speaker 04:** `ALEXANDER MAGVAS // BEST MAN`
- **Speaker 05:** `ED // CEREMONY OFFICIANT`

### Technical Alignment Specifications:
- **Placement:** Lower Left corner (X: 12%, Y: 16%). Complies with 10% broadcast title safe boundary.
- **Accent Rule:** 2.5px solid warm gold hairline (`#E5B96F`) separating Name from Role.
- **In / Out Timing:** Invert-mask vertical rise (12 frames), hold 4.5 seconds, smooth dissolve out (8 frames).

---

## 3. 9:16 Vertical Social Captions (Instagram Reels)

### Mobile Hook Retention:
- **Font & Size:** Space Mono Bold (Uppercase, 32pt @ 1080x1920).
- **Pacing:** Max 3 to 4 words per graphic slice (e.g. *"I PROMISE TO" &rarr; "CHOOSE YOU" &rarr; "EVERY SINGLE DAY"*).
- **Color Scheme:** Pure White text with active spoken word highlighted in **Volt Yellow (`#E5FF44`)**.

### Background Contrast Box:
- **Contrast Pill:** Semi-transparent black pill box (`RGBA 10,10,10, 0.85`) with 12px rounded corners and 1px border.
- **Placement:** Center-bottom at Y: 72% (above Instagram Reels handle and music title overlays).

---

## 4. Architectural Closing End Credits Roll

| Section | Credit Entries | Typographical Specification |
| :--- | :--- | :--- |
| **Hero Title** | EMLIA & JOHN<br>A Celebration at Den 1880 | Syne Bold 64pt / Space Mono 22pt (Warm Amber). Centered at top of crawl. |
| **Family & Wedding Party** | Parents of the Bride, Parents of the Groom, Maid of Honor, Best Man | 2-column symmetrical layout. Header: 18pt 60% gray; Name: 26pt Pure White. |
| **Vendor & Location Tributes** | Officiant Ed, DJ Thunderstorm, Naomi Kemeny (Photo), Den 1880 | Space Mono Regular 22pt. Distinct block separation with 60px vertical spacing. |
| **Production Signature** | MUK POST PRODUCTION<br>Jackson McMurdo & Declan | Concludes with MUK POST emblem watermark fading over final slow-motion room candle out. |

---

## 5. Step-by-Step Installation & Import Guide

### DaVinci Resolve Studio (Fusion):
1. Navigate to `06_Exports/Client_Delivery_Portal/Motion_Graphics_and_Titles/`.
2. Copy all `.setting` files to:
   ```bash
   ~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Templates/Edit/Titles/
   ```
3. In DaVinci Resolve, open *Effects Library &rarr; Titles &rarr; Fusion Titles*.
4. Drag **MUK_POST_Master_Title_Card** directly onto Video Track 3 above your S-Log3 footage.
5. Drop `MUK_POST_239_Cinema_Scope_Matte_4K.png` onto Video Track 4.

### Adobe Premiere Pro:
1. Open Premiere Pro and load `MUK_POST_Premiere_Master_Template.xml`.
2. Open the *Essential Graphics* panel &rarr; click *Install Motion Graphics Template* or drag visual mockups into project bins.
3. Drop `MUK_POST_239_Cinema_Scope_Matte_4K.png` across entire sequence on Track V4.
4. For 9:16 vertical captions, use Text tool with **Space Mono Bold**, apply the pre-configured drop shadow, and enable Auto-Ducking on Audio Submix 2.

---

## 6. Complete Asset Inventory

- `MUK_POST_Master_Title_Card.setting` (Native DaVinci Resolve Text+ Macro)
- `MUK_POST_Lower_Third_Architectural.setting` (Speaker identification macro)
- `MUK_POST_Chapter_Divider.setting` (Den 1880 timeline section dividers)
- `MUK_POST_End_Credits_Roll.setting` (Continuous vertical closing crawl)
- `MUK_POST_239_Cinema_Scope_Matte_4K.png` (3840x2160 true 2.39:1 anamorphic matte)
- `MUK_POST_35mm_Film_Gate_Overlay_4K.png` (3840x2160 rounded optical gate overlay)
- `mockup_01_master_title_card_4k.png` (4K Opening title visual reference)
- `mockup_02_lower_thirds_speakers_4k.png` (4K Speakers lower thirds reference)
- `mockup_03_vertical_captions_reels_9x16.png` (9:16 Reels caption reference)
- `mockup_04_closing_credits_roll_4k.png` (4K Full credits roll reference)
