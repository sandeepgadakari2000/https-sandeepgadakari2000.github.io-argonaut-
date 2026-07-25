/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Argus On-Device Intelligence Engine
   ───────────────────────────────────────────────────────────
   A fully self-contained, explainable fraud-detection model.
   Nothing leaves the browser: no API, no key, no network call.

   Pipeline (stacked ensemble):
     1. Feature extraction  — entities + weighted fraud lexicons
     2. Six specialist detectors emit calibrated evidence
     3. A logistic meta-scorer pools the engineered features
        into one fraud probability → 0–100 trust score
     4. Registry / community reconciliation
     5. Verdict classification + templated narrative

   Weights were tuned against a labelled set of Indian job-fraud
   and legitimate posts (see the model test harness). The pipeline
   is deterministic and every score is fully explainable.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.model = (function () {
  "use strict";

  const VERSION = "Argus On-Device Intelligence v4.1 (trained hybrid)";

  /* ── Weighted lexicons (alphanumeric, matched on a normalised
        haystack so quotes/punctuation never hide a phrase) ──── */
  const LEX = {
    fee: [
      ["registration fee", 1], ["registration charge", 1], ["registration amount", 1],
      ["security deposit", 1], ["refundable deposit", .95], ["caution deposit", 1],
      ["training fee", 1], ["training charge", .9], ["training kit", .8],
      ["kit fee", 1], ["kit charge", 1], ["processing fee", .95], ["processing charge", .95],
      ["onboarding fee", 1], ["joining fee", 1], ["enrollment fee", 1], ["enrolment fee", 1],
      ["activation fee", 1], ["gst on offer", 1], ["one time payment", .8],
      ["advance payment", .85], ["pay to apply", 1], ["id card fee", .9],
      ["courier charge", .7], ["courier fee", .7], ["small fee", .8], ["membership fee", 1],
      ["refundable amount", .85], ["registration amount", 1],
    ],
    data: [
      ["aadhaar", .8], ["aadhar", .8], [" pan ", .7], ["pan card", .95], ["pan number", .95],
      ["bank details", .9], ["bank account", .85], ["account number", .8], ["ifsc", .8],
      ["atm pin", 1], [" otp ", .8], [" cvv ", 1], ["debit card", .9], ["credit card", .9],
      ["upload your documents", .7], ["share your documents", .7], ["net banking", .85],
      ["upi pin", 1], ["card number", .95],
    ],
    bait: [
      ["comment interested", 1], ["comment yes", 1], ["comment below", .85],
      ["comment down", .8], ["type interested", 1], ["dm me", .9], ["dm for", .9],
      ["inbox me", .85], ["message me for", .85], ["ping me", .8], ["whatsapp me", .9],
      ["tag someone", .95], ["tag your friends", .95], ["tag 3", 1], ["tag a friend", .9],
      ["type 1", .85], ["reply yes", .85], ["drop your number", .95], ["share your number", .9],
      ["send your number", .9], ["drop a comment", .8], ["like and share", .6], ["dm career", .9],
    ],
    channel: [
      ["join telegram", 1], ["telegram group", .95], ["telegram channel", .9],
      ["whatsapp group", .8], ["whatsapp only", .9], ["only on whatsapp", .9],
      ["contact on whatsapp", .75], ["message on whatsapp", .7], ["chat on telegram", 1],
    ],
    comp: [
      ["no experience", .7], ["no interview", .95], ["without interview", .95],
      ["guaranteed income", 1], ["guaranteed job", 1], ["guaranteed placement", .95],
      ["100 job", .9], ["daily payout", .95], ["weekly payout", .85], ["daily income", .9],
      ["earn daily", .95], ["work from home earn", .85], ["unlimited earning", 1],
      ["unlimited income", 1], ["instant earning", .95], ["easy money", .95],
      ["quick money", .95], ["no skills", .8], ["no qualification", .75], ["just by", .5],
    ],
    urgency: [
      ["limited seats", .85], ["few seats", .8], ["seats left", .8], ["hurry", .7],
      ["apply fast", .75], ["closing tonight", .9], ["closing soon", .7], ["last date today", .8],
      ["immediate joining", .7], ["urgent hiring", .7], ["urgent requirement", .65],
      ["spot offer", .9], ["instant offer", .9], ["hiring closes", .7], ["act now", .7],
      ["shortlisting is live", .7], ["dont miss", .6],
    ],
    mlm: [
      ["build your team", .9], ["build your own team", .95], ["referral chain", .95],
      ["downline", 1], ["network marketing", .9], ["be your own boss", .9],
      ["recruit members", .95], ["financial freedom", .8], ["passive income", .7],
      ["business opportunity", .55],
    ],
    legit: [
      ["greenhouse", .9], ["lever co", 1], ["myworkdayjobs", 1], ["workday", .8],
      ["naukri", .7], ["smartrecruiters", 1], ["icims", 1], ["taleo", 1], ["successfactors", .9],
      ["careers", .7], ["notice period", .7], ["reporting manager", .8], ["interview rounds", .8],
      ["technical round", .8], ["hr round", .7], ["roles and responsibilities", .7],
      ["job description", .5], ["years of experience", .55], [" ctc", .55], ["annual ctc", .7],
      ["hiring manager", .6], ["walk in drive", .55], ["employee referral", .55],
      ["equal opportunity employer", .8], ["provident fund", .6], ["screening round", .7],
    ],
  };

  const BANK_SUFFIX = "ok\\w+|ybl|paytm|apl|axl|ibl|okhdfcbank|oksbi|okaxis|okicici|upi|axisb|hdfcbank|icici|sbi|barodampay|cnrb|fbl|idfcbank|indus|kotak|yesbank|fam|freecharge|pockets";
  const FREE_MAIL = ["gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "rediffmail.com", "ymail.com", "proton.me", "icloud.com"];
  const ROLE_RE = /\b((?:senior |junior |sr\.? |jr\.? |lead |principal |associate )?(?:software |backend |back end |frontend |front end |full stack |data |business |sales |marketing |field |customer |process |quality )?(?:engineer|developer|manager|executive|analyst|designer|consultant|specialist|architect|officer|accountant|recruiter|coordinator|associate|intern|trainee|telecaller|sdet|tester|administrator|representative|scientist|lead))\b/i;
  const STOP_LEAD = /^(re|a|an|the|time|our|is|are|for|we|of|as|to|and|part|full)\s+/i;

  const clamp = (x, lo, hi) => x < lo ? lo : x > hi ? hi : x;
  const clamp01 = x => clamp(x, 0, 1);
  const sigmoid = z => 1 / (1 + Math.exp(-z));

  function tally(hay, list) {
    let sum = 0; const found = [];
    for (const [phrase, w] of list) if (hay.includes(phrase)) { sum += w; found.push(phrase.trim()); }
    return { sum, found };
  }

  /* ── 1 · Feature extraction ─────────────────────────── */
  function extract(text) {
    const raw = String(text || "");
    const low = raw.toLowerCase();
    /* normalised haystack: punctuation → space, so "comment 'yes'"
       and "aadhaar, pan" both match cleanly */
    const hay = " " + low.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() + " ";

    const letters = (raw.match(/[A-Za-z]/g) || []).length;
    const caps = (raw.match(/[A-Z]/g) || []).length;
    const emoji = (raw.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu) || []).length;
    const excl = (raw.match(/!/g) || []).length;
    const words = (raw.trim().match(/\S+/g) || []).length;

    /* identifiers (from raw — keep @ . /) */
    const emails = [...new Set((raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []))];
    const upi = [...new Set((raw.match(new RegExp("\\b[\\w.\\-]{2,}@(?:" + BANK_SUFFIX + ")\\b", "gi")) || []))]
      .filter(u => !emails.includes(u));
    const phones = [...new Set((raw.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g) || [])
      .concat(raw.match(/(?:\+?91[\s-]?)?[6-9]\d[X]{2,}\d{2,}/gi) || []).map(p => p.trim()))];
    const urls = [...new Set((raw.match(/https?:\/\/[^\s)]+/gi) || []))];

    /* salary */
    const salMatch = raw.match(/(?:₹|rs\.?|inr)\s?[\d,]+(?:\s?[-–]\s?[\d,]+)?\s?(?:k|lpa|lakh|lac|cr|per month|\/month|pm|per day|\/day|daily|per week)?/i);
    const salary = salMatch ? salMatch[0].replace(/\s+/g, " ").trim() : null;
    const perDayPay = /(?:₹|rs\.?|inr)?\s?[\d,]{3,}\s?(?:\/|per\s)?\s?(?:day|daily|week)\b/i.test(raw);

    /* fee regex boosts (catch "registration ₹500", "pay rs 1500") */
    const feeRx = /(registration|processing|joining|onboarding|enrol|enrollment|activation|training|security|caution|refundable|kit|courier|membership|application|id\s?card)\s+(fee|charge|charges|amount|deposit|money|payment)/i.test(raw);
    const payRx = /(pay|deposit|send|transfer|paid)\s+(rs\.?|₹|inr)?\s*[\d,]{2,}/i.test(raw);
    const onlyRx = /(rs\.?|₹|inr)\s*[\d,]{2,}\s*(only|refundable|registration|deposit|fee)/i.test(raw);
    const feeBoost = Math.min(2.5, (feeRx ? 1.5 : 0) + (payRx ? 1.0 : 0) + (onlyRx ? .8 : 0));

    /* lexicon tallies */
    const L = {}; for (const k of Object.keys(LEX)) L[k] = tally(hay, LEX[k]);
    const feeScore = L.fee.sum + feeBoost;

    const telegramLink = /t\.me\/|telegram/i.test(raw);
    const channelScore = L.channel.sum + (telegramLink ? 0.9 : 0);

    /* structural */
    const hasATS = /greenhouse\.io|lever\.co|myworkdayjobs|workday|smartrecruiters|icims\.com|taleo\.net|naukri\.com\/job|linkedin\.com\/jobs|careers\.[a-z0-9-]+\.[a-z]|[a-z0-9-]+\.com\/careers|[a-z0-9-]+\.[a-z]+\/careers/i.test(raw);
    const corpEmail = emails.some(e => !FREE_MAIL.includes((e.split("@")[1] || "").toLowerCase()));
    const freeHrEmail = emails.some(e => FREE_MAIL.includes((e.split("@")[1] || "").toLowerCase())) &&
      /\bhr\b|recruit|talent|hiring|career/i.test(raw);
    const personalWa = phones.length > 0 && /whatsapp|telegram/i.test(raw);

    /* linguistic penalties */
    const capsRatio = letters ? caps / letters : 0;
    const capsPen = capsRatio > .45 && letters > 40 ? 1 : capsRatio > .3 && letters > 40 ? .5 : 0;
    const emojiPen = emoji >= 6 ? 1 : emoji >= 3 ? .5 : 0;
    const exclPen = excl >= 4 ? .8 : excl >= 2 ? .4 : 0;
    const lingPen = capsPen + emojiPen + exclPen;

    /* company */
    let company = null;
    for (const name of (Argus.SEED_VERIFIED || [])) {
      if (new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(raw)) { company = name; break; }
    }
    if (!company) {
      const m = raw.match(/(?:@|join(?:ing)?|hiring at|company[:\s]|employer[:\s])\s+([A-Z][A-Za-z0-9&.\- ]{2,28}?)(?:\s+(?:is|are|for|as|—|-|\n|,|\.)|$)/);
      if (m) company = m[1].trim().replace(/\s+/g, " ");
    }

    /* role */
    let role = null;
    const rm = raw.match(ROLE_RE);
    if (rm) { role = rm[1].trim().replace(/\s+/g, " "); while (STOP_LEAD.test(role)) role = role.replace(STOP_LEAD, ""); role = role.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40).trim() || null; }

    /* location */
    let location = null;
    for (const c of (Argus.CITY_PATTERNS || [])) if (low.includes(c)) { location = c === "bangalore" ? "Bengaluru" : c[0].toUpperCase() + c.slice(1); break; }

    /* contact */
    let contact = null;
    if (telegramLink) contact = "Telegram";
    else if (personalWa) contact = "Personal WhatsApp number";
    else if (hasATS) contact = "Official application link";
    else if (emails.length) contact = corpEmail ? "Company email" : "Personal email";
    else if (phones.length) contact = "Phone number";
    else if (L.bait.sum > 0) contact = "Comment / DM";

    return {
      raw, words, letters, capsRatio, emoji, excl, lingPen,
      emails, upi, phones, urls, salary, perDayPay,
      L, feeBoost, feeScore, channelScore, telegramLink,
      hasATS, corpEmail, freeHrEmail, personalWa, company, role, location, contact,
    };
  }

  /* ── 2 · Detectors → red / green evidence ─────────────── */
  function detect(f) {
    const red = [], green = [];
    if (f.feeScore > 0)
      red.push({ sev: "HIGH", flag: "Upfront payment demanded", why: `Fee, deposit, or 'pay-first' language detected${f.L.fee.found[0] ? ` ("${f.L.fee.found[0]}")` : ""}. No legitimate Indian employer charges you to be hired — the fee is the scam.` });
    if (f.upi.length)
      red.push({ sev: "HIGH", flag: "UPI collection handle present", why: `A UPI handle (${f.upi[0]}) appears in a hiring message — a hallmark of registration-fee fraud.` });
    if (f.L.data.sum >= 1.2)
      red.push({ sev: "HIGH", flag: "Sensitive identity data requested", why: "Asks for KYC/financial identifiers (Aadhaar, PAN, or bank details) before any formal offer — an identity-theft pattern." });
    else if (f.L.data.sum > 0)
      red.push({ sev: "MEDIUM", flag: "Personal data requested early", why: "Requests personal identifiers unusually early in the process." });
    if (f.L.bait.sum >= 1.6)
      red.push({ sev: "HIGH", flag: "Engagement-bait recruiting", why: `Uses "${f.L.bait.found[0]}" instead of a real application flow — the post's goal is reach, not hiring.` });
    else if (f.L.bait.sum > 0)
      red.push({ sev: "MEDIUM", flag: "Engagement-bait phrasing", why: `Signals like "${f.L.bait.found[0]}" push comments/DMs rather than a formal application.` });
    if (f.channelScore > 0)
      red.push({ sev: "MEDIUM", flag: "Off-platform contact channel", why: `Pushes the conversation to ${f.telegramLink ? "Telegram" : "WhatsApp"}, where there is no moderation or paper trail.` });
    if (f.perDayPay || f.L.comp.found.some(x => /earn|income|payout|money|guaranteed/.test(x)))
      red.push({ sev: "HIGH", flag: "Unrealistic compensation claim", why: "Promises outsized or per-day earnings for low-skill work — the classic 'task scam' lure." });
    else if (f.L.comp.sum > 0)
      red.push({ sev: "MEDIUM", flag: "Too-good-to-be-true framing", why: `Signals like "${f.L.comp.found[0]}" are typical of fraudulent listings.` });
    if (f.L.urgency.sum > 0)
      red.push({ sev: "MEDIUM", flag: "Manufactured urgency", why: `Pressure tactics ("${f.L.urgency.found[0]}") push you to act before you can verify.` });
    if (f.L.mlm.sum > 0)
      red.push({ sev: "MEDIUM", flag: "MLM / referral-chain language", why: `"${f.L.mlm.found[0]}" indicates a recruitment pyramid rather than a salaried role.` });
    if (f.freeHrEmail)
      red.push({ sev: "MEDIUM", flag: "‘HR’ using a free email", why: "A recruiter contact on Gmail/Yahoo instead of a company domain is a common impersonation tell." });
    if (f.lingPen >= 1.4)
      red.push({ sev: "LOW", flag: "Sensational formatting", why: "Heavy caps, emoji, and exclamation use is a spam/scam signature, not corporate recruiting." });

    if (f.hasATS) green.push({ flag: "Official application channel", why: "Links to a recognised ATS or company careers page — how real employers legally collect applications." });
    if (f.corpEmail) green.push({ flag: "Corporate email domain", why: "Contact uses a company domain rather than a free Gmail/Yahoo address." });
    if (f.L.legit.found.some(x => /notice period|reporting manager|interview rounds|technical round|screening round|responsibilities|ctc/.test(x)))
      green.push({ flag: "Concrete role detail", why: "Mentions interview process, reporting structure, or specific responsibilities — depth scammers rarely bother with." });
    return { red, green };
  }

  /* ── 3 · Logistic meta-scorer → fraud probability ─────── */
  function scoreFraud(f) {
    const fee = Math.min(f.feeScore, 3);
    const data = Math.min(f.L.data.sum, 3);
    const bait = Math.min(f.L.bait.sum, 3);
    const channel = Math.min(f.channelScore, 2);
    const comp = Math.min(f.L.comp.sum, 3);
    const urg = Math.min(f.L.urgency.sum, 3);
    const mlm = Math.min(f.L.mlm.sum, 2);
    const legit = Math.min(f.L.legit.sum, 4);

    const z =
      -0.20
      + 1.80 * fee + 2.30 * (f.upi.length ? 1 : 0)
      + 1.60 * data
      + 1.15 * bait + 1.50 * channel
      + 1.20 * comp + 0.60 * urg + 1.20 * mlm + 1.80 * (f.perDayPay ? 1 : 0)
      + 0.55 * f.lingPen
      + 0.80 * (f.freeHrEmail ? 1 : 0) + 0.70 * (f.personalWa ? 1 : 0)
      - 2.40 * (f.hasATS ? 1 : 0) - 1.40 * (f.corpEmail ? 1 : 0)
      - 0.55 * legit - 0.50 * (f.words > 55 ? 1 : 0);

    return clamp01(sigmoid(z));
  }

  /* ── 3b · Trained ML layer (TF-IDF + logistic, from ml/train.py) ──
     Replicates scikit-learn's TfidfVectorizer + LogisticRegression
     inference exactly, so the browser scores with weights LEARNED from
     data. Returns null if weights aren't loaded (then rules stand alone). */
  function mlProbability(text) {
    const W = Argus.MODEL_WEIGHTS;
    if (!W || !W.vocab || !W.coef) return null;
    const toks = (String(text || "").toLowerCase().match(/[a-z0-9_]{2,}/g)) || [];
    const grams = toks.slice();
    const nmax = W.ngram_max || 1;
    for (let n = 2; n <= nmax; n++)
      for (let i = 0; i + n <= toks.length; i++) grams.push(toks.slice(i, i + n).join(" "));
    const tf = {};
    for (const g of grams) { const idx = W.vocab[g]; if (idx !== undefined) tf[idx] = (tf[idx] || 0) + 1; }
    let norm = 0;
    for (const k in tf) { const w = tf[k] * W.idf[k]; norm += w * w; }
    norm = Math.sqrt(norm) || 1;
    let dot = 0;
    for (const k in tf) dot += ((tf[k] * W.idf[k]) / norm) * W.coef[k];
    return clamp01(sigmoid(dot + W.intercept));
  }

  /* ── 4 · Registry / community reconciliation ──────────── */
  function reconcile(f, pScam) {
    let note = null;
    const isVerified = f.company && Argus.store && Argus.store.isVerified(f.company);
    if (isVerified && pScam < 0.5) { pScam = clamp01(pScam - 0.18); note = "verified-employer"; }
    try {
      const hits = Argus.store.checkScamLibrary(f.raw, { phones: f.phones, upi: f.upi, emails: f.emails });
      if (hits && hits.length) { pScam = Math.max(pScam, 0.82); note = "community-match"; }
    } catch (e) { /* store optional */ }
    return { pScam, isVerified, note };
  }

  /* ── 5 · Careers verification (honest, on-device) ─────── */
  function verify(f) {
    const url = f.urls.find(u => /greenhouse\.io|lever\.co|workday|smartrecruiters|icims|taleo|naukri\.com|linkedin\.com\/jobs|careers/i.test(u)) || (f.hasATS ? f.urls[0] : null);
    const verified = f.company && Argus.store.isVerified(f.company);
    if (f.hasATS && verified)
      return { status: "PARTIALLY_VERIFIED", careers_url: url || null, detail: "A recognised employer and an official application link were both detected on-device. Open the link to confirm the exact role." };
    if (f.hasATS)
      return { status: "PARTIALLY_VERIFIED", careers_url: url || null, detail: "An official ATS / careers link was detected. Argus runs on-device and can't fetch the live page — open the link yourself to confirm the listing." };
    if (verified)
      return { status: "INCONCLUSIVE", careers_url: null, detail: `${f.company} is a recognised employer, but this post carries no official application link — verify the role on their careers page directly.` };
    if (f.company)
      return { status: "COMPANY_UNVERIFIED", careers_url: null, detail: "The named company isn't in the recognised-employer registry and no official careers link was found." };
    return { status: "INCONCLUSIVE", careers_url: null, detail: "No official application link or recognised employer was detected in the text." };
  }

  /* ── 6 · Verdict + narrative ──────────────────────────── */
  function classify(pScam, f, red) {
    let score = Math.round(clamp01(1 - pScam) * 100);
    const hasFin = f.feeScore > 0 || f.upi.length > 0;
    const hasData = f.L.data.sum >= 1.2;
    const hasUnreal = f.perDayPay || f.L.comp.sum >= 1.4 || f.L.mlm.sum > 0;
    const moneyRisk = hasFin || hasData || hasUnreal;
    const hasBait = f.L.bait.sum > 0 || f.channelScore > 0;

    let type;
    if (moneyRisk && score < 58) type = "ACTUAL_SCAM";
    else if (hasBait) type = !moneyRisk ? "ENGAGEMENT_BAIT" : (score < 45 ? "ACTUAL_SCAM" : "ENGAGEMENT_BAIT");
    else if (score >= 66) type = "LEGITIMATE";
    else if (score < 38) type = "ACTUAL_SCAM";
    else type = "SUSPICIOUS";

    /* pure engagement bait is spam, not necessarily a money scam —
       keep the score in the cautious band rather than condemning it */
    if (type === "ENGAGEMENT_BAIT" && !moneyRisk) score = clamp(score, 38, 60);
    /* never claim absolute certainty — a probabilistic advisory always
       leaves a sliver of "verify independently" */
    score = Math.min(score, 97);

    const verdict = score >= 81 ? "REAL" : score >= 66 ? "LIKELY_REAL" : score >= 46 ? "SUSPICIOUS" : score >= 26 ? "LIKELY_FAKE" : "FAKE";
    const strongCt = red.filter(r => r.sev === "HIGH").length;
    const confidence = (strongCt >= 2 || score <= 20 || score >= 85) ? "HIGH" : (f.words < 12 ? "LOW" : "MEDIUM");
    return { score, verdict, verdict_type: type, confidence };
  }

  function narrate(f, cls, red, verif, note) {
    const topRed = red.find(r => r.sev === "HIGH") || red[0];
    let summary, rec;
    switch (cls.verdict_type) {
      case "ACTUAL_SCAM":
        summary = `This post shows the signature of a job scam (trust ${cls.score}/100).${topRed ? ` ${topRed.flag} is the strongest signal.` : ""} Its structure matches fraud patterns reported across the Indian job market.`;
        rec = "Do not pay any fee, share KYC documents, or continue on WhatsApp/Telegram. Report the identifier in the Scam Library and at cybercrime.gov.in."; break;
      case "ENGAGEMENT_BAIT":
        summary = `A job may exist here, but the post uses growth-hacking tactics rather than a genuine hiring flow (trust ${cls.score}/100). Treat the recruiter's intent with caution.`;
        rec = "Don't apply via a comment or DM. Find the role on the company's official careers page and apply there instead."; break;
      case "LEGITIMATE":
        summary = `This post carries the markers of a genuine opening (trust ${cls.score}/100)${verif.status === "PARTIALLY_VERIFIED" ? " and references an official application channel" : ""}. No major fraud signals were detected.`;
        rec = "Looks legitimate, but always apply through the official link and never pay to be hired."; break;
      default:
        summary = `The evidence is mixed (trust ${cls.score}/100).${topRed ? ` ${topRed.flag} raises concern, but` : " There is"} not enough to condemn or clear this post outright.`;
        rec = "Verify the role independently on the company's official careers page before sharing any personal data.";
    }
    if (note === "community-match") summary = "⚠ An identifier in this post is already on the community scam blocklist. " + summary;
    else if (note === "verified-employer") summary += " The named company is a recognised employer.";
    return { summary, recommendation: rec };
  }

  /* ── PUBLIC · analyze a job post → structured verdict ──── */
  function analyze(text) {
    const f = extract(text);
    const flags = detect(f);
    /* Hybrid score: the data-trained ML model (js/model-weights.js)
       blended with the interpretable rule engine. If the trained
       weights aren't present, the rules stand alone. */
    const pRules = scoreFraud(f);
    const pMl = mlProbability(text);
    const W = Argus.MODEL_WEIGHTS;
    const blend = (W && typeof W.blend === "number") ? W.blend : 0.6;
    const pHybrid = (pMl == null) ? pRules : (blend * pMl + (1 - blend) * pRules);
    const rc = reconcile(f, pHybrid);
    const verif = verify(f);
    const cls = classify(rc.pScam, f, flags.red);
    const nar = narrate(f, cls, flags.red, verif, rc.note);

    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }, seen = new Set();
    const red_flags = flags.red
      .filter(r => (seen.has(r.flag) ? false : seen.add(r.flag)))
      .sort((a, b) => order[a.sev] - order[b.sev])
      .map(r => ({ flag: r.flag, severity: r.sev, explanation: r.why }));
    const gseen = new Set();
    const green_flags = flags.green
      .filter(g => (gseen.has(g.flag) ? false : gseen.add(g.flag)))
      .map(g => ({ flag: g.flag, explanation: g.why }));

    return {
      trust_score: cls.score,
      verdict: cls.verdict,
      verdict_type: cls.verdict_type,
      confidence: cls.confidence,
      summary: nar.summary,
      extracted: {
        company: f.company || null, role: f.role || null, location: f.location || null,
        salary: f.salary || null, contact_method: f.contact || null, poster: null,
        identifiers: { phones: f.phones, upi: f.upi, emails: f.emails },
      },
      verification: verif,
      red_flags, green_flags,
      recommendation: nar.recommendation,
      report_note: "If this verdict seems wrong, report it — every correction sharpens the on-device model.",
      _debug: {
        pScam: Number(rc.pScam.toFixed(3)),
        pRules: Number(pRules.toFixed(3)),
        pMl: pMl == null ? null : Number(pMl.toFixed(3)),
        trained: pMl != null,
      },
    };
  }

  return { analyze, extract, mlProbability, VERSION };
})();
