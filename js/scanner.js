/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Scanner & Batch Pipeline
   Core pipeline: fingerprint dedupe → Argus AI engine
   → scam-library cross-check → ledger/telemetry/audit updates
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

(function () {
  const S = Argus.store, FP = Argus.fp, C = Argus.charts;
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ── Scanner state ──────────────────────────────────── */
  const st = {
    tab: "text", text: "", imgB64: null, imgType: null, imgPreview: null,
    loading: false, phase: 0, result: null, meta: null, error: null, timers: [],
    ocrPhase: false, ocrProgress: 0, ocrText: null, ocrConfidence: null,
  };

  function clearTimers() { st.timers.forEach(clearTimeout); st.timers = []; }

  /* ═══ MAIN ANALYSIS PIPELINE ═══════════════════════════ */
  async function analyze(force) {
    st.error = null; st.errorAction = null;
    if (st.tab === "text" && !st.text.trim()) { st.error = "Paste the job post text first."; return render(); }
    if (st.tab === "image" && !st.imgB64) { st.error = "Upload a screenshot first."; return render(); }
    if (!S.hasConsent()) { Argus.app.openConsent(); return; }

    const scanId = "run_" + Date.now().toString(36);
    const isText = st.tab === "text";

    /* 1 — Fingerprint (always free, always local) */
    let exact = null, sim = null, imgHash = null;
    if (isText) {
      exact = FP.exactHash(st.text);
      sim = FP.simhash(st.text).toString(16);
      S.audit(scanId, "FINGERPRINT", `Normalized text → exact ${exact.slice(0, 10)}…, SimHash-64 computed`);
    } else {
      try {
        imgHash = (await FP.imageDHash(st.imgPreview)).toString(16);
        S.audit(scanId, "FINGERPRINT", `Perceptual dHash computed: ${imgHash.slice(0, 10)}…`);
      } catch (e) { /* non-fatal */ }
    }

    /* 2 — Duplicate detection: zero-cost instant path */
    if (!force) {
      const dup = S.findDuplicate({ exact, sim, imgHash });
      if (dup && dup.scan.result) {
        S.audit(scanId, "CACHE_HIT",
          `${dup.kind === "exact" ? "Exact fingerprint match" : dup.kind === "near" ? `Near-duplicate (hamming ${dup.distance})` : `Perceptual image match (hamming ${dup.distance})`} — zero AI cost`);
        st.result = dup.scan.result;
        st.meta = {
          scanId, cached: true, dupKind: dup.kind, distance: dup.distance,
          firstSeen: dup.scan.ts, seenCount: dup.seenCount,
          sources: dup.scan.sources || [], latencyMs: 0,
          libHits: S.checkScamLibrary(isText ? st.text : "", dup.scan.result.extracted && dup.scan.result.extracted.identifiers),
        };
        st.loading = false;
        return render();
      }
      S.audit(scanId, "CACHE_MISS", "No fingerprint match in local intelligence DB — escalating to AI");
    } else {
      S.audit(scanId, "CACHE_BYPASS", "User requested fresh AI analysis");
    }

    /* 3 — Screenshot → text (on-device OCR), then treat as text */
    let analyzeText = isText ? st.text : null;
    if (!isText) {
      st.loading = true; st.ocrPhase = true; st.ocrProgress = 0; st.result = null; st.ocrText = null;
      render();
      let ocr = null, ocrErr = null;
      try {
        ocr = await Argus.ocr.recognize(st.imgPreview, p => { st.ocrProgress = p; renderOcr(); });
      } catch (e) { ocrErr = e; }
      st.ocrPhase = false;
      const clean = ocr ? ocr.text.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").trim() : "";
      if (clean.replace(/\s/g, "").length < 15) {
        st.result = imageFallbackResult(!!ocrErr);
        st.meta = { scanId, cached: false, sources: [], latencyMs: 0, libHits: [], ocrFailed: true };
        S.audit(scanId, ocrErr ? "OCR_UNAVAILABLE" : "OCR_LOW_TEXT",
          ocrErr ? String(ocrErr.message).slice(0, 120) : "OCR found too little clear text to analyse");
        st.loading = false;
        return render();
      }
      st.ocrText = clean; st.ocrConfidence = ocr.confidence;
      analyzeText = clean;
      // link the screenshot's text into the local dedup DB
      exact = FP.exactHash(clean);
      sim = FP.simhash(clean).toString(16);
      S.audit(scanId, "OCR", `Read ${clean.length} characters from the screenshot (confidence ${ocr.confidence}%)`);
    }

    /* 4 — On-device Argus model (unlimited — no API, no cost) */
    st.loading = true; st.phase = 0; st.result = null;
    render();
    clearTimers();
    st.timers.push(setTimeout(() => { st.phase = 1; renderPhases(); }, 420));
    st.timers.push(setTimeout(() => { st.phase = 2; renderPhases(); }, 880));

    try {
      S.audit(scanId, "MODEL_CALL", `Analyzed on-device by ${Argus.CONFIG.ENGINE_LABEL} — no data left the browser`);
      const { parsed, sources, latencyMs } = await Argus.engine.analyzePost({ text: analyzeText });
      S.recordUsage();
      S.audit(scanId, "MODEL_RESPONSE", `Structured verdict received in ${(latencyMs / 1000).toFixed(1)}s — score ${parsed.trust_score}, ${parsed.verdict_type}`);

      /* 5 — Community scam-library cross-check */
      const ids = (parsed.extracted && parsed.extracted.identifiers) ||
        FP.extractIdentifiers(analyzeText || "");
      const libHits = S.checkScamLibrary(analyzeText || "", ids);
      if (libHits.length && parsed.trust_score > 25) {
        S.audit(scanId, "COMMUNITY_MATCH",
          `${libHits.length} known scam identifier(s) matched — trust score capped at 25 (was ${parsed.trust_score})`);
        parsed.trust_score = 25;
        if (parsed.verdict === "REAL" || parsed.verdict === "LIKELY_REAL") parsed.verdict = "SUSPICIOUS";
      }

      /* 6 — Persist intelligence */
      const saved = S.saveScan({
        exact, sim, imgHash,
        snippet: (isText ? "" : "[screenshot] ") + (analyzeText || "(screenshot)").slice(0, 140),
        result: parsed, sources,
        company: parsed.extracted && parsed.extracted.company,
      });
      if (parsed.extracted) {
        S.upsertCompany(parsed.extracted.company, parsed.trust_score, parsed.verdict_type);
        S.recordTelemetry(parsed.extracted.location || "");
      }
      S.audit(scanId, "LEDGER_UPDATE", `Company ledger + geospatial telemetry updated; scan ${saved.id} fingerprint stored`);

      st.result = parsed;
      st.meta = { scanId, cached: false, sources, latencyMs, libHits, ocrText: st.ocrText, ocrConfidence: st.ocrConfidence };
    } catch (err) {
      const msg = String(err.message || "");
      st.error = `Analysis hit an unexpected error: ${msg}. Please try again.`;
      st.errorAction = null;
      S.audit(scanId, "ERROR", msg.slice(0, 160));
    } finally {
      clearTimers();
      st.loading = false;
      render();
    }
  }

  /* ═══ RENDERING ════════════════════════════════════════ */
  function render() {
    const view = document.getElementById("view");
    if (!view || Argus.app.route() !== "scanner") return;
    view.innerHTML = `
    <div class="container" style="max-width:860px">
      <section class="fadeup" style="text-align:center;margin-bottom:28px;padding-top:8px">
        <div class="eyebrow" style="justify-content:center">Live Scanner · ${esc(Argus.CONFIG.ENGINE_LABEL)}</div>
        <h2 class="sec-title">Verify any job post in seconds</h2>
        <p class="sec-sub" style="margin:0 auto">Paste a LinkedIn post or WhatsApp forward — Argus fingerprints it against the local intelligence DB first, then runs the on-device fraud model. Everything happens in your browser: no account, no API key, nothing leaves this device.</p>
      </section>
      ${st.result ? resultHTML() : inputHTML()}
    </div>`;
    wire();
  }

  function inputHTML() {
    return `
    <div class="glass card-pad fadeup" id="scan-card">
      <div class="tabs">
        <button class="tab ${st.tab === "text" ? "on" : ""}" data-tab="text">Paste Post Text</button>
        <button class="tab ${st.tab === "image" ? "on" : ""}" data-tab="image">Upload Screenshot</button>
      </div>
      ${st.tab === "text" ? `
        <textarea id="scan-text" class="input-area" placeholder="Paste the full job post here...&#10;&#10;Example: &quot;We are HIRING! Comment INTERESTED below and I'll DM you the JD. 50 freshers needed urgently. Work from home. Earn ₹40,000–80,000/month. Zero experience required. Only 5 seats left — apply TODAY!&quot;">${esc(st.text)}</textarea>
        <div style="margin-top:7px;font-size:11.5px;color:var(--ink-3);display:flex;justify-content:space-between">
          <span>Fingerprinted locally before any AI call</span>
          <span id="char-count">${st.text.length ? st.text.length + " characters" : ""}</span>
        </div>`
      : st.imgPreview ? `
        <div style="position:relative">
          <img src="${st.imgPreview}" alt="Uploaded screenshot" style="width:100%;border-radius:12px;max-height:280px;object-fit:contain;border:1px solid var(--border-strong);background:var(--neutral-bg)"/>
          <button id="img-remove" class="btn-ghost btn-sm" style="position:absolute;top:10px;right:10px">✕ Remove</button>
        </div>`
      : `
        <div class="dropzone" id="dropzone">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <div style="font-size:15px;font-weight:600;color:var(--ink-2);margin-bottom:6px">Drop screenshot here or click to upload</div>
          <div style="font-size:12.5px;color:var(--ink-3)">PNG · JPG · WEBP — matched against known scam images via perceptual hashing</div>
        </div>
        <input type="file" id="img-input" accept="image/*" style="display:none"/>`}
      ${st.error ? `<div style="margin-top:14px;padding:12px 16px;background:var(--crit-bg);border:1px solid var(--crit-border);border-radius:11px;font-size:13.5px;color:var(--crit-strong);line-height:1.6">${esc(st.error)}</div>` : ""}
      <div id="phases-slot">${st.loading ? (st.ocrPhase ? ocrHTML() : phasesHTML()) : ""}</div>
      ${!st.loading ? `
        <button class="btn-primary" id="analyze-btn" style="width:100%;margin-top:18px">Analyze Job Post</button>` : ""}
    </div>`;
  }

  function phasesHTML() {
    const phases = [
      { n: "1", label: "Fingerprint check — local intelligence DB" },
      { n: "2", label: "Analysing fraud signals & entities" },
      { n: "3", label: "Computing calibrated trust score" },
    ];
    return `
    <div style="margin-top:16px;padding:16px 18px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:13px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--scanline),transparent);animation:scanline 1.8s linear infinite"></div>
      <div style="display:flex;flex-direction:column;gap:9px">
        ${phases.map((p, i) => {
          const done = i < st.phase, active = i === st.phase;
          return `
          <div style="display:flex;align-items:center;gap:11px;opacity:${i > st.phase ? ".28" : "1"};transition:opacity .45s">
            <div style="width:26px;height:26px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:${done ? 13 : 12}px;background:${done ? "var(--good-bg-strong)" : active ? "var(--accent-bg-strong)" : "var(--neutral-bg)"};border:1px solid ${done ? "var(--good-border)" : active ? "var(--accent-border-strong)" : "var(--neutral-border)"}">
              ${done ? "✓" : active ? '<span class="spinner"></span>' : p.n}
            </div>
            <span style="font-size:13.5px;font-weight:500;color:${done ? "var(--good)" : active ? "var(--accent-text)" : "var(--ink-3)"}">${p.label}${done ? " ✓" : active ? "..." : ""}</span>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }
  function renderPhases() {
    const slot = document.getElementById("phases-slot");
    if (slot && st.loading) slot.innerHTML = phasesHTML();
  }

  /* ── OCR loading panel (screenshots) ────────────────── */
  function ocrHTML() {
    const pct = st.ocrProgress || 0;
    return `
    <div style="margin-top:16px;padding:16px 18px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:13px">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">
        <span class="spinner"></span>
        <span style="font-size:13.5px;font-weight:600;color:var(--accent-text)">Reading text from your screenshot…</span>
        <span style="margin-left:auto;font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums">${pct}%</span>
      </div>
      <div style="height:6px;border-radius:4px;background:var(--neutral-bg);overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--accent);transition:width .25s"></div>
      </div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:8px;line-height:1.5">On-device OCR — the image never leaves your browser. The first image scan downloads the engine (~5&nbsp;MB), then it's cached.</div>
    </div>`;
  }
  function renderOcr() {
    const slot = document.getElementById("phases-slot");
    if (slot && st.ocrPhase) slot.innerHTML = ocrHTML();
  }

  function imageFallbackResult(offline) {
    return {
      trust_score: 50, verdict: "SUSPICIOUS", verdict_type: "SUSPICIOUS", confidence: "LOW",
      summary: offline
        ? "The OCR engine couldn't load — it needs an internet connection the first time you scan an image (after that it's cached). Paste the post's text for a full trained-model analysis."
        : "Argus couldn't read enough clear text from this screenshot. Crop tightly to the post text, use a sharper image, or paste the text for a full verdict.",
      extracted: { company: null, role: null, location: null, salary: null, contact_method: null, poster: null, identifiers: { phones: [], upi: [], emails: [] } },
      verification: { status: "INCONCLUSIVE", careers_url: null, detail: "On-device OCR could not extract usable text from the image." },
      red_flags: [], green_flags: [],
      recommendation: "Paste the job post's text into the Scanner for a full trained-model analysis.",
      report_note: "If this screenshot is a known scam that wasn't caught, report it to grow the community image library.",
    };
  }

  function ocrPanelHTML(m) {
    const conf = m.ocrConfidence == null ? 0 : m.ocrConfidence;
    const confColor = conf >= 80 ? "var(--good)" : conf >= 55 ? "var(--warn)" : "var(--crit)";
    return `
    <div class="glass-flat" style="padding:16px 18px;margin-bottom:14px;border-radius:14px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <span class="card-label" style="margin:0">Text read from your screenshot</span>
        <span class="chip neutral" style="font-size:9px">OCR confidence <b style="color:${confColor}">${conf}%</b></span>
      </div>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:8px;line-height:1.5">OCR isn't perfect — check the text below. Fix any misreads, then re-analyse for the most accurate verdict.</div>
      <textarea id="ocr-text" class="input-area" style="min-height:96px;font-size:13px">${esc(m.ocrText)}</textarea>
      <button class="btn-ghost btn-sm" id="ocr-reanalyze" style="margin-top:10px">Re-analyse edited text</button>
    </div>`;
  }

  /* ── Result blocks ──────────────────────────────────── */
  function resultHTML() {
    const r = st.result, m = st.meta || {};
    const ss = Argus.scoreStyle(r.trust_score);
    const verif = r.verification ? Argus.VERIF_CFG[r.verification.status] : null;
    const vtype = r.verdict_type ? Argus.VTYPE_CFG[r.verdict_type] : null;
    const company = r.extracted && r.extracted.company;
    const companyRec = company ? S.companyRecord(company) : null;
    const isVerifiedEmp = company && S.isVerified(company);

    return `
    <div class="fadeup">
      ${m.cached ? dupBannerHTML(m) : ""}
      ${(m.libHits && m.libHits.length) ? libHitsHTML(m.libHits) : ""}

      <!-- Score card -->
      <div class="glass card-pad" style="border-color:${ss.border};margin-bottom:14px">
        <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
          ${C.gauge(r.trust_score)}
          <div style="flex:1;min-width:220px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
              <span style="font-size:24px;font-weight:800;color:${ss.color};font-family:var(--font-display);text-shadow:0 0 22px ${ss.glow};letter-spacing:-.4px">${esc((r.verdict || "").replace(/_/g, " "))}</span>
              ${vtype ? `<span class="chip" style="color:${vtype.color};background:${vtype.color}18;border:1px solid ${vtype.color}35">${vtype.label}</span>` : ""}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
              <span class="chip neutral">Confidence: ${esc(r.confidence || "—")}</span>
              ${m.cached ? `<span class="chip cyan">Instant — cached intelligence</span>`
                : `<span class="chip accent">${Argus.CONFIG.ENGINE_LABEL} · ${(m.latencyMs / 1000).toFixed(1)}s</span>`}
              ${isVerifiedEmp ? `<span class="badge-verified">✔ Verified Employer</span>` : ""}
            </div>
            <p style="font-size:14px;color:var(--ink-2);line-height:1.66">${esc(r.summary)}</p>
          </div>
        </div>
      </div>

      ${m.ocrText ? ocrPanelHTML(m) : ""}

      ${verif ? `
      <div class="glass-flat" style="background:${verif.bg};border-color:${verif.border};padding:16px 18px;margin-bottom:14px;border-radius:14px">
        <div class="card-label">Careers Page Verification</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:15px;font-weight:700;color:${verif.color}">${verif.label}</span>
        </div>
        <div style="font-size:13.5px;color:var(--ink-2);line-height:1.55">${esc(r.verification.detail)}</div>
        ${r.verification.careers_url && r.verification.careers_url !== "null"
          ? `<a href="${esc(r.verification.careers_url)}" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:${verif.color};font-weight:600;display:inline-flex;gap:5px;margin-top:10px">Open the application link ↗</a>` : ""}
      </div>` : ""}

      ${companyRec && companyRec.scans > 1 ? `
      <div class="glass-flat" style="padding:16px 18px;margin-bottom:14px;border-radius:14px">
        <div class="card-label">Company Trust Ledger — network memory</div>
        <div style="display:flex;gap:22px;flex-wrap:wrap;font-size:13px;color:var(--ink-2)">
          <div><b style="color:var(--ink);font-size:16px">${companyRec.scans.toLocaleString("en-IN")}</b><br>network scans</div>
          <div><b style="color:${Argus.scoreStyle(companyRec.avgScore).color};font-size:16px">${companyRec.avgScore}</b><br>avg trust score</div>
          <div><b style="color:${companyRec.flags > companyRec.scans / 2 ? "var(--crit)" : "var(--ink)"};font-size:16px">${companyRec.flags.toLocaleString("en-IN")}</b><br>suspicious flags</div>
          <div style="align-self:center">${companyRec.verified ? '<span class="badge-verified">✔ Verified Employer</span>' : '<span class="chip neutral">Unverified</span>'}</div>
        </div>
      </div>` : ""}

      ${r.extracted ? extractedHTML(r.extracted) : ""}
      ${(r.red_flags || []).length ? flagsHTML(r.red_flags) : ""}
      ${(r.green_flags || []).length ? greenHTML(r.green_flags) : ""}

      <div class="glass-flat" style="background:var(--accent-bg);border-color:var(--accent-border);padding:16px 18px;margin-bottom:14px;border-radius:14px">
        <div class="card-label">Recommendation</div>
        <div style="font-size:14px;color:var(--ink-2);line-height:1.64">${esc(r.recommendation)}</div>
      </div>

      <details class="glass-flat" style="padding:14px 18px;margin-bottom:14px;border-radius:14px">
        <summary style="cursor:pointer;font-size:11px;font-weight:700;letter-spacing:2px;color:var(--ink-3);text-transform:uppercase">Audit Trail — evidence log for this determination</summary>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
          ${S.auditLog(m.scanId).slice().reverse().map(e => `
            <div style="display:flex;gap:10px;font-size:12px;align-items:baseline">
              <span class="mono" style="color:var(--ink-3);flex-shrink:0">${new Date(e.ts).toLocaleTimeString("en-IN")}</span>
              <span class="chip neutral" style="font-size:9px">${esc(e.step)}</span>
              <span style="color:var(--ink-2)">${esc(e.detail)}</span>
            </div>`).join("") || '<div style="font-size:12px;color:var(--ink-3)">No audit entries for this scan.</div>'}
        </div>
      </details>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-ghost" id="share-btn" style="flex:1;min-width:140px">Share Result</button>
        <button class="btn-ghost" id="report-btn" style="flex:1;min-width:140px;color:var(--ink-3)">Report Incorrect Result</button>
        ${m.cached ? `<button class="btn-ghost" id="fresh-btn" style="flex:1;min-width:140px">Re-run Fresh AI Analysis</button>` : ""}
      </div>
      <button id="reset-btn" style="width:100%;margin-top:12px;padding:11px;background:transparent;border:none;color:var(--ink-3);font-size:13px;cursor:pointer">← Analyze another post</button>
      <div style="text-align:center;font-size:11px;color:var(--ink-3);margin-top:6px;line-height:1.6">
        Probabilistic advisory only — not a legal determination of fraud. Verify independently before acting.
      </div>
    </div>`;
  }

  function dupBannerHTML(m) {
    const kinds = {
      exact: "Exact fingerprint match — this identical post is already in the intelligence DB",
      near: `Near-duplicate detected (SimHash distance ${m.distance}) — a lightly edited copy of a known post`,
      image: `Perceptual image match (distance ${m.distance}) — this screenshot recycles a known scam graphic`,
    };
    return `
    <div class="glass-flat" style="background:var(--hl-bg);border-color:var(--hl-border);padding:16px 18px;margin-bottom:14px;border-radius:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="font-weight:700;color:var(--hl-ink);font-size:14px;margin-bottom:3px">Instant duplicate detection — zero AI cost</div>
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">${kinds[m.dupKind] || ""}. First analyzed ${new Date(m.firstSeen).toLocaleString("en-IN")}${m.seenCount > 1 ? ` · seen ${m.seenCount}× locally` : ""}. Result served from fingerprint cache in milliseconds.</div>
        </div>
      </div>
    </div>`;
  }

  function libHitsHTML(hits) {
    return `
    <div class="glass-flat" style="background:var(--crit-bg);border-color:var(--crit-border);padding:16px 18px;margin-bottom:14px;border-radius:14px">
      <div class="card-label" style="color:var(--crit-strong)">Community Scam Library Match</div>
      ${hits.map(h => `
        <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:6px;font-size:13px">
          <span class="chip crit">${esc(h.type)}</span>
          <span class="mono" style="color:var(--crit-strong)">${esc(h.value)}</span>
          <span style="color:var(--ink-2)">${esc(h.note)} · ${h.reports} report${h.reports > 1 ? "s" : ""}</span>
        </div>`).join("")}
      <div style="font-size:12px;color:var(--ink-2);margin-top:8px">This post contains identifiers already reported by the community. Trust score has been capped.</div>
    </div>`;
  }

  function extractedHTML(ex) {
    const rows = [
      ["Company", ex.company], ["Role", ex.role], ["Location", ex.location],
      ["Salary", ex.salary], ["Contact", ex.contact_method], ["Posted by", ex.poster],
    ].filter(d => d[1] && d[1] !== "null");
    if (!rows.length) return "";
    return `
    <div class="glass-flat" style="padding:16px 18px;margin-bottom:14px;border-radius:14px">
      <div class="card-label">Extracted Job Details</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
        ${rows.map(([k, v]) => `
          <div>
            <div style="font-size:10.5px;color:var(--ink-3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">${k}</div>
            <div style="font-size:13.5px;color:var(--ink);font-weight:500">${esc(v)}</div>
          </div>`).join("")}
      </div>
    </div>`;
  }

  function flagsHTML(flags) {
    const cfg = { HIGH: "var(--crit)", MEDIUM: "var(--warn)", LOW: "var(--ink-2)" };
    return `
    <div class="glass-flat" style="padding:16px 18px;margin-bottom:14px;border-radius:14px">
      <div class="card-label">Red Flags (${flags.length})</div>
      ${flags.map(f => {
        const c = cfg[f.severity] || "var(--ink-2)";
        return `
        <div class="flag-row" style="background:var(--crit-bg);border:1px solid var(--crit-border)">
          <span class="chip" style="color:${c};background:transparent;border:1px solid ${c};flex-shrink:0;margin-top:1px">${esc(f.severity)}</span>
          <div><div class="fr-title">${esc(f.flag)}</div><div class="fr-sub">${esc(f.explanation)}</div></div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function greenHTML(flags) {
    return `
    <div class="glass-flat" style="background:var(--good-bg);border-color:var(--good-border);padding:16px 18px;margin-bottom:14px;border-radius:14px">
      <div class="card-label">Positive Signals (${flags.length})</div>
      ${flags.map(f => `
        <div class="flag-row" style="background:var(--good-bg);border:1px solid var(--good-border)">
          <span style="color:var(--good);flex-shrink:0;margin-top:1px;font-size:15px">✓</span>
          <div><div class="fr-title">${esc(f.flag)}</div><div class="fr-sub">${esc(f.explanation)}</div></div>
        </div>`).join("")}
    </div>`;
  }

  /* ── Wiring ─────────────────────────────────────────── */
  function wire() {
    const $ = id => document.getElementById(id);
    document.querySelectorAll("#scan-card .tab").forEach(t =>
      t.addEventListener("click", () => { st.tab = t.dataset.tab; st.error = null; st.errorAction = null; st.ocrText = null; render(); }));
    const ta = $("scan-text");
    if (ta) ta.addEventListener("input", e => {
      st.text = e.target.value;
      const cc = $("char-count");
      if (cc) cc.textContent = st.text.length ? st.text.length + " characters" : "";
    });
    const dz = $("dropzone");
    if (dz) {
      dz.addEventListener("click", () => $("img-input").click());
      dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("over"); });
      dz.addEventListener("dragleave", () => dz.classList.remove("over"));
      dz.addEventListener("drop", e => { e.preventDefault(); dz.classList.remove("over"); handleImage(e.dataTransfer.files[0]); });
      $("img-input").addEventListener("change", e => handleImage(e.target.files[0]));
    }
    if ($("img-remove")) $("img-remove").addEventListener("click", () => {
      st.imgB64 = st.imgType = st.imgPreview = null; render();
    });
    if ($("err-settings")) $("err-settings").addEventListener("click", () => Argus.app.openSettings(false));
    if ($("analyze-btn")) $("analyze-btn").addEventListener("click", () => analyze(false));
    if ($("fresh-btn")) $("fresh-btn").addEventListener("click", () => { st.result = null; analyze(true); });
    if ($("share-btn")) $("share-btn").addEventListener("click", shareResult);
    if ($("report-btn")) $("report-btn").addEventListener("click", reportResult);
    if ($("ocr-reanalyze")) $("ocr-reanalyze").addEventListener("click", () => {
      const t = ($("ocr-text").value || "").trim();
      if (t.replace(/\s/g, "").length < 15) { Argus.app.toast("Add a bit more text to analyse"); return; }
      st.tab = "text"; st.text = t; st.result = null; st.meta = null; st.ocrText = null;
      st.imgB64 = st.imgType = st.imgPreview = null;
      render(); analyze(false);
    });
    if ($("reset-btn")) $("reset-btn").addEventListener("click", () => {
      st.result = null; st.meta = null; st.text = ""; st.imgB64 = st.imgType = st.imgPreview = null; st.error = null; st.errorAction = null;
      st.ocrText = null; st.ocrConfidence = null; st.ocrPhase = false;
      render();
    });
  }

  function handleImage(file) {
    if (!file || !file.type.startsWith("image/")) return;
    st.imgType = file.type;
    const reader = new FileReader();
    reader.onload = e => {
      st.imgPreview = e.target.result;
      st.imgB64 = e.target.result.split(",")[1];
      st.error = null;
      render();
    };
    reader.readAsDataURL(file);
  }

  function shareResult() {
    const r = st.result;
    if (!r) return;
    const flags = (r.red_flags || []).map(f => `  • ${f.flag} [${f.severity}]`).join("\n");
    const card = [
      `Argonaut Scan Report`,
      ``,
      `Verdict : ${(r.verdict || "").replace(/_/g, " ")} | Trust Score: ${r.trust_score}/100`,
      `Type    : ${(Argus.VTYPE_CFG[r.verdict_type] || {}).label || r.verdict_type}`,
      `Careers : ${(Argus.VERIF_CFG[(r.verification || {}).status] || {}).label || ""}`,
      ``,
      r.summary,
      flags ? `\nRed Flags:\n${flags}` : "",
      ``,
      `Recommendation: ${r.recommendation}`,
      ``,
      `— Argonaut · AI job verification · Protecting Indian job seekers`,
    ].join("\n");
    Argus.app.copyText(card, "Scan report copied — paste it anywhere to warn others");
  }

  /* This used to copy a report and ask the user to email it. That
     address was never read, so every correction was silently lost —
     and it pointed users at a domain we don't control, on a page that
     promises nothing leaves the browser. Instead, copy the post and
     open the Telegram bot: one 👎 there files a correction we can
     actually retrain on. */
  function reportResult() {
    if (!st.result) return;
    const post = (st.text || st.ocrText || "").trim();
    if (post) {
      Argus.app.copyText(post, "Post copied — paste it to the Argonaut bot and tap 👎 Wrong");
    } else {
      Argus.app.toast("Opening the Argonaut bot — send the post there and tap 👎 Wrong");
    }
    window.open(Argus.CONFIG.BOT_URL, "_blank", "noopener");
  }

  /* ═══ BATCH PIPELINE (B2B / Placement Cells) ═══════════ */
  const bst = { rows: [], running: false, cancel: false, input: "" };

  function renderBatch() {
    const view = document.getElementById("view");
    if (!view || Argus.app.route() !== "batch") return;
    view.innerHTML = `
    <div class="container" style="max-width:980px">
      <section class="fadeup" style="margin-bottom:24px;padding-top:8px">
        <div class="eyebrow">Institutional Pipeline · B2B</div>
        <h2 class="sec-title">Batch Verification Pipeline</h2>
        <p class="sec-sub">Built for placement cells, HR compliance teams, and recruiting networks. Paste multiple posts (separated by a line containing only <span class="mono">---</span>) or upload a CSV — each row is fingerprint-checked first, and only unknown posts consume AI quota. Export a structured hazard report when done.</p>
      </section>

      <div class="glass card-pad fadeup" style="margin-bottom:18px">
        <textarea id="batch-input" class="input-area" style="min-height:150px"
          placeholder="Post 1 text here...&#10;---&#10;Post 2 text here...&#10;---&#10;Post 3 text here...">${esc(bst.input)}</textarea>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center">
          <button class="btn-primary btn-sm" id="batch-run" ${bst.running ? "disabled" : ""}>${bst.running ? "Processing…" : "Run Pipeline"}</button>
          <button class="btn-ghost btn-sm" id="batch-csv">Upload CSV / TXT</button>
          <input type="file" id="batch-file" accept=".csv,.txt" style="display:none"/>
          ${bst.running ? `<button class="btn-danger-ghost btn-sm" id="batch-cancel">Stop</button>` : ""}
        </div>
      </div>

      ${bst.rows.length ? `
      <div class="glass card-pad fadeup">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
          <div class="card-label" style="margin:0">Hazard Report — ${bst.rows.length} item${bst.rows.length > 1 ? "s" : ""}</div>
          <button class="btn-ghost btn-sm" id="batch-export">Export CSV</button>
        </div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>#</th><th>Post</th><th>Company</th><th>Score</th><th>Verdict</th><th>Source</th></tr></thead>
          <tbody>
            ${bst.rows.map((row, i) => `
            <tr>
              <td class="mono">${i + 1}</td>
              <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(row.snippet)}">${esc(row.snippet.slice(0, 60))}${row.snippet.length > 60 ? "…" : ""}</td>
              <td>${esc(row.company || "—")}</td>
              <td>${row.status === "done" ? `<b style="color:${Argus.scoreStyle(row.score).color}" class="mono">${row.score}</b>` : "—"}</td>
              <td>${row.status === "done"
                ? `<span class="chip" style="color:${(Argus.VTYPE_CFG[row.vtype] || {}).color || "var(--ink-2)"};border:1px solid currentColor;background:transparent">${(Argus.VTYPE_CFG[row.vtype] || {}).label || row.vtype || "—"}</span>`
                : row.status === "running" ? '<span class="spinner"></span>'
                : row.status === "error" ? `<span class="chip crit">Error</span>`
                : row.status === "skipped" ? `<span class="chip warn">Quota</span>`
                : '<span style="color:var(--ink-3)">Queued</span>'}</td>
              <td>${row.cached === true ? '<span class="chip cyan">Cache</span>' : row.cached === false ? '<span class="chip accent">AI</span>' : "—"}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      </div>` : ""}

      <div class="glass-flat fadeup" style="padding:18px 20px;margin-top:18px;border-radius:14px;font-size:13px;color:var(--ink-2);line-height:1.7">
        <b style="color:var(--ink)">Placement cell?</b> The hosted institutional tier adds async workers for thousands of links, spreadsheet ingestion, student-facing alerts, and a compliance dashboard — see <a href="#/home" onclick="location.hash='#/home';setTimeout(()=>document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'}),150)">Pricing</a>.
      </div>
    </div>`;
    wireBatch();
  }

  function wireBatch() {
    const $ = id => document.getElementById(id);
    const ta = $("batch-input");
    if (ta) ta.addEventListener("input", e => { bst.input = e.target.value; });
    if ($("batch-csv")) $("batch-csv").addEventListener("click", () => $("batch-file").click());
    if ($("batch-file")) $("batch-file").addEventListener("change", e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const txt = String(ev.target.result || "");
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 20);
        bst.input = lines.join("\n---\n");
        renderBatch();
        Argus.app.toast(`Loaded ${lines.length} rows from ${f.name}`);
      };
      reader.readAsText(f);
    });
    if ($("batch-run")) $("batch-run").addEventListener("click", runBatch);
    if ($("batch-cancel")) $("batch-cancel").addEventListener("click", () => { bst.cancel = true; });
    if ($("batch-export")) $("batch-export").addEventListener("click", exportBatchCSV);
  }

  async function runBatch() {
    if (bst.running) return;
    if (!S.hasConsent()) { Argus.app.openConsent(); return; }
    const posts = bst.input.split(/\n\s*---\s*\n/).map(p => p.trim()).filter(p => p.length > 20).slice(0, 25);
    if (!posts.length) { Argus.app.toast("Paste at least one post (20+ characters)"); return; }
    bst.rows = posts.map(p => ({ snippet: p, status: "queued", company: null, score: null, vtype: null, cached: null }));
    bst.running = true; bst.cancel = false;
    renderBatch();

    for (let i = 0; i < posts.length; i++) {
      if (bst.cancel) { bst.rows[i].status = "skipped"; continue; }
      const row = bst.rows[i];
      row.status = "running"; renderBatch();
      const scanId = "batch_" + Date.now().toString(36) + "_" + i;
      try {
        const exact = FP.exactHash(row.snippet);
        const sim = FP.simhash(row.snippet).toString(16);
        const dup = S.findDuplicate({ exact, sim });
        if (dup && dup.scan.result) {
          const r = dup.scan.result;
          Object.assign(row, { status: "done", cached: true, score: r.trust_score, vtype: r.verdict_type, company: (r.extracted || {}).company });
          S.audit(scanId, "CACHE_HIT", `Batch row ${i + 1}: fingerprint match — zero AI cost`);
          continue;
        }
        if (S.quotaLeft() <= 0) { row.status = "skipped"; S.audit(scanId, "THROTTLED", `Batch row ${i + 1}: quota ceiling`); continue; }
        const { parsed, sources } = await Argus.engine.analyzePost({ text: row.snippet, fast: true });
        S.recordUsage();
        const ids = (parsed.extracted && parsed.extracted.identifiers) || FP.extractIdentifiers(row.snippet);
        const libHits = S.checkScamLibrary(row.snippet, ids);
        if (libHits.length && parsed.trust_score > 25) parsed.trust_score = 25;
        S.saveScan({ exact, sim, snippet: row.snippet.slice(0, 140), result: parsed, sources, company: (parsed.extracted || {}).company });
        if (parsed.extracted) {
          S.upsertCompany(parsed.extracted.company, parsed.trust_score, parsed.verdict_type);
          S.recordTelemetry(parsed.extracted.location || "");
        }
        Object.assign(row, { status: "done", cached: false, score: parsed.trust_score, vtype: parsed.verdict_type, company: (parsed.extracted || {}).company });
        S.audit(scanId, "MODEL_RESPONSE", `Batch row ${i + 1}: score ${parsed.trust_score}`);
      } catch (err) {
        row.status = "error";
        S.audit(scanId, "ERROR", `Batch row ${i + 1}: ${String(err.message || "").slice(0, 120)}`);
      }
      renderBatch();
    }
    bst.running = false;
    renderBatch();
    Argus.app.toast("Batch pipeline complete");
  }

  function exportBatchCSV() {
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lines = [["#", "post", "company", "trust_score", "verdict_type", "source"].join(",")];
    bst.rows.forEach((r, i) => lines.push([
      i + 1, q(r.snippet.slice(0, 200)), q(r.company || ""), r.score == null ? "" : r.score,
      q(r.vtype || r.status), r.cached === true ? "cache" : r.cached === false ? "ai" : "",
    ].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "argonaut-hazard-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* Pre-fill the scanner from the landing's scan bar */
  function prefill(text) {
    st.tab = "text";
    st.text = String(text || "");
    st.result = null;
    st.error = null;
  }

  Argus.scanner = { render, renderBatch, prefill };
})();
