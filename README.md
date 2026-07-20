# 🛡 Argonaut — AI-Powered Job Verification

Production-ready web app that verifies LinkedIn / WhatsApp job posts for the Indian job market. Premium **"The Voyage" museum design**: parchment surfaces, bronze & terracotta accents, Cinzel + Inter typography, and a full-viewport three.js particle landing that morphs trireme → phyllotaxis sphere → Argus eye → scan vortex across four exhibit panels. No build tools, no server, no install.

The product UI is fully **white-labeled** — it speaks only of the "Argus AI" engine. (Owner note, not shown in the app: the engine is backed by Google's Gemini API; keep that disclosed in your formal privacy policy as a third-party processor for DPDP compliance.)

## ▶ How to run

Just **double-click `index.html`** — it opens in your browser and works immediately.
(Chrome or Edge recommended. Internet needed only for AI analysis — fonts and the three.js/GSAP landing libraries are shipped locally in `fonts/` and `js/vendor/`.)

The **Home** page is the landing experience: scroll, arrow keys, or the right-hand dot rail move between the four exhibits; the scan bar on Exhibit IV pre-fills the real Scanner.

## 🔑 One-time setup (2 minutes)

AI analysis needs a free engine access key:

1. Go to <https://aistudio.google.com/apikey> and sign in with your Google account
2. Click **Create API key** and copy it
3. In Argonaut, click the **⚙ gear** (top right) → paste the key → **Save settings**

The key is stored only in your browser. Without a key, duplicate-detection lookups, the Panic Button, Learning Hub, and dashboards still work — only fresh AI scans need the key.

## 🚀 Releasing an update (cache busting)

`index.html` contains a tiny boot loader with one constant:

```js
window.APP_BUILD = "2026.07.18-1";
```

**Bump this string on every release** — every stylesheet and script busts caches together. No per-tag version juggling. (On a real host, also send `Cache-Control: no-cache` for `index.html` itself so browsers always fetch the loader.)

## 📊 Metrics are real

All dashboard numbers derive from scans on the device — nothing is simulated. Fresh installs show designed empty states; charts, threat level, hotspots, and the company ledger populate as verifications run. The scam blocklist and threat advisories are curated network content (labeled as such), and Verified Employer registry rows carry a badge only, never fabricated scan counts.

## 🗺 What's inside

| Area | What it does |
|---|---|
| **Scanner** | Paste post text or upload a screenshot → trust score 0–100, verdict, red/green flags, live careers-page verification with grounding sources |
| **Duplicate detection** | Posts are SimHash-fingerprinted on-device; known/edited copies return instantly with **zero AI cost**. Screenshots matched by perceptual dHash |
| **Telemetry** | Real scan-volume trend, verdict distribution, regional activity, curated network threat advisories |
| **Intelligence** | Company trust ledger (+ Verified Employer registry) · community scam blocklist (phones/UPI/domains, cross-checked on every scan) · Applicant Vault · full audit trail |
| **Batch** | B2B / placement-cell pipeline: paste posts separated by `---` or upload CSV → structured hazard report → export CSV |
| **Learn** | 5 micro-modules + Spot-the-Scam simulator |
| **🚨 Panic** | Instant on-device legitimacy check for interview/meeting links (typosquats, IP links, brand impersonation, shorteners) + optional AI deep check |
| **⚙ Settings** | Engine key, daily AI quota ceiling (graceful throttling), DPDP data rights: export / erase / withdraw consent |

## 🔒 Privacy & disclaimers

- DPDP Act 2023: itemized, withdrawable consent on first run; all data stays in the browser
- Trust scores are **probabilistic advisories**, not legal determinations
- Report real financial fraud at <https://cybercrime.gov.in>

## 🧰 Tech

Vanilla HTML/CSS/JS (zero build; three.js + GSAP vendored locally for the landing only) · search-grounded LLM engine (provider confined to `js/engine.js` + `js/config.js`) · SimHash-64 & dHash fingerprinting · localStorage persistence · light "museum vitrine" glassmorphism design system where **all theme decisions live in `css/style.css`** — JS templates reference semantic CSS variables only.

Files: `index.html` · `css/style.css` · `fonts/*.woff2` (Cinzel + Inter, offline) · `js/vendor/{three.min, gsap.min}.js` · `js/{config, fingerprint, store, engine, charts, scanner, views, landing, app}.js`
