# 🛡 Argonaut — AI-Powered Job Verification

Production-ready web app that verifies LinkedIn / WhatsApp job posts for the Indian job market. Premium **"The Voyage" museum design**: parchment surfaces, bronze & terracotta accents, Cinzel + Inter typography, and a full-viewport three.js particle landing that morphs trireme → phyllotaxis sphere → Argus eye → scan vortex across four exhibit panels. No build tools, no server, no install.

The verification engine — **Argus On-Device Intelligence** — runs **entirely in the browser**. There is no API, no account, and no key: every job post is analysed locally, so nothing a user pastes ever leaves their device. This makes the privacy promise literally true and gives unlimited, zero-cost scans.

## ▶ How to run

Just **double-click `index.html`** — it opens in your browser and works immediately, fully offline. (Chrome or Edge recommended. Fonts and the three.js/GSAP landing libraries are shipped locally in `fonts/` and `js/vendor/`, so no internet connection is required at all.)

The **Home** page is the landing experience: scroll, arrow keys, or the right-hand dot rail move between the four exhibits; the scan bar on Exhibit IV pre-fills the real Scanner.

## 🧠 The Argus model (`js/model.js` + `ml/`)

The fraud verdict is produced by a self-contained, explainable **hybrid model** — no LLM, no network — combining a **data-trained classifier** with an interpretable **rule engine**:

1. **Feature extraction** — entities (company, role, location, salary, phones, UPI handles, emails, URLs) plus weighted Indian-job-fraud lexicons (fees, data-harvest, engagement bait, off-platform channels, unrealistic pay, MLM, urgency) and structural signals (ATS links, corporate vs. free email, caps/emoji/exclamation ratios).
2. **Trained ML layer** — a TF-IDF + Logistic-Regression model **trained in Python** (`ml/train.py`, scikit-learn) whose learned weights are exported to `js/model-weights.js` and run **on-device**. The browser reproduces scikit-learn's inference exactly (verified to 3 decimals via `ml/parity_check.py`).
3. **Rule engine** — six specialist detectors emit calibrated red/green evidence and a logistic meta-score.
4. **Blend** — trained model + rules are combined (default 60/40, `blend` in `model-weights.js`) into a single fraud probability → **0–100 trust score**.
5. **Registry / community reconciliation** — recognised-employer boost, and a hard cap when an identifier matches the community scam blocklist.
6. **Verdict classification** (Legitimate / Engagement Bait / Suspicious / Actual Scam) + a plain-English summary and recommendation.

The training pipeline (`ml/`) compares five classifiers, grid-tunes the best, and reports full metrics. **To make the model stronger, append real labelled posts to `ml/dataset.csv` and re-run `python train.py`** — see `ml/README.md`. Every score is deterministic and fully explainable via the emitted evidence and the on-scan audit trail.

## 🚀 Releasing an update (cache busting)

`index.html` contains a tiny boot loader with one constant:

```js
window.APP_BUILD = "2026.07.24-1";
```

**Bump this string on every release** — every stylesheet and script busts caches together. No per-tag version juggling. (On a real host, also send `Cache-Control: no-cache` for `index.html` itself so browsers always fetch the loader.)

## 📊 Metrics are real

All dashboard numbers derive from scans on the device — nothing is simulated. Fresh installs show designed empty states; charts, threat level, hotspots, average trust score, and the company ledger populate as verifications run. The scam blocklist and threat advisories are curated network content (labeled as such), and Verified Employer registry rows carry a badge only, never fabricated scan counts.

## 🗺 What's inside

| Area | What it does |
|---|---|
| **Scanner** | Paste post text **or upload a screenshot** — images are read on-device by OCR (Tesseract.js, lazy-loaded) and the recognised text (shown & editable) runs through the trained model → trust score 0–100, verdict, red/green flags, careers-link detection, full evidence trail |
| **Duplicate detection** | Posts are SimHash-fingerprinted on-device; known/edited copies return instantly from cache. Screenshots matched by perceptual dHash |
| **Telemetry** | Real scan-volume trend, verdict distribution, regional activity, average trust score, curated network threat advisories |
| **Intelligence** | Company trust ledger (+ Verified Employer registry) · community scam blocklist (phones/UPI/domains, cross-checked on every scan) · Applicant Vault · full audit trail |
| **Batch** | B2B / placement-cell pipeline: paste posts separated by `---` or upload CSV → structured hazard report → export CSV |
| **Learn** | 5 micro-modules + Spot-the-Scam simulator |
| **🚨 Panic** | Instant on-device legitimacy check for interview/meeting links (typosquats, IP links, brand impersonation, shorteners) |
| **⚙ Settings** | On-device engine status, DPDP data rights: export / erase / withdraw consent |

## 🔒 Privacy & disclaimers

- **Fully on-device**: every scan is analysed in the browser — no server, no third party, no upload
- DPDP Act 2023: itemized, withdrawable consent on first run; all data stays in the browser
- Trust scores are **probabilistic advisories**, not legal determinations
- Report real financial fraud at <https://cybercrime.gov.in>

## 🧰 Tech

Vanilla HTML/CSS/JS at **runtime** (zero build; three.js + GSAP vendored locally for the landing only) · hybrid on-device fraud model (`js/model.js` + trained weights in `js/model-weights.js`, orchestrated by `js/engine.js`) · **Python / scikit-learn** for offline training (`ml/`) · SimHash-64 & dHash fingerprinting · localStorage persistence · light "museum vitrine" glassmorphism design system where **all theme decisions live in `css/style.css`** — JS templates reference semantic CSS variables only.

Screenshot OCR uses **Tesseract.js**, lazy-loaded from a CDN only when an image is scanned (the core app stays offline); it runs in-browser via WASM so the image is never uploaded.

Files: `index.html` · `css/style.css` · `fonts/*.woff2` (Cinzel + Inter, offline) · `js/vendor/{three.min, gsap.min}.js` · `js/{config, fingerprint, store, model-weights, model, engine, ocr, charts, scanner, views, landing, app}.js` · `ml/{generate_dataset, train, parity_check}.py` + `dataset.csv`
