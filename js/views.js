/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Views: Home · Dashboard · Intelligence · Learn
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

(function () {
  const S = Argus.store, C = Argus.charts;
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ═══ HOME ═════════════════════════════════════════════ */
  function renderHome() {
    const view = document.getElementById("view");
    const stats = S.stats();
    view.innerHTML = `
    <div class="container">

      <!-- HERO -->
      <section class="fadeup" style="text-align:center;padding:44px 0 10px;position:relative">
        <div class="ship-watermark" aria-hidden="true"></div>
        <div class="argus-seal" aria-hidden="true"></div>
        <div class="eyebrow" style="justify-content:center">India-First Fraud Intelligence · Argus AI Engine</div>
        <h1 class="hero-title">Detect the fake.<br><span class="grad">Protect the seeker.</span></h1>
        <p class="sec-sub" style="margin:0 auto 30px;font-size:16px">
          Argonaut is an accumulative fraud-intelligence platform for India's 350M+ job seekers —
          not another chat wrapper. Every scan strengthens a shared memory of fingerprints,
          company trust scores, and scam identifiers that raw AI chats fundamentally cannot build.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button class="btn-primary" data-go="scanner">🔍 Scan a Job Post</button>
          <button class="btn-ghost" data-go="dashboard">📡 View Live Telemetry</button>
        </div>
        <div class="meander" style="margin-top:34px" aria-hidden="true"></div>
      </section>

      <!-- STATS STRIP (real device data only) -->
      <section class="grid grid-4 fadeup">
        <div class="glass stat-tile"><div class="s-label">Posts Verified</div>
          <div class="s-value">${stats.scanned.toLocaleString("en-IN")}</div>
          <div class="s-hint"><span class="pulse-dot"></span>&nbsp; on this device</div></div>
        <div class="glass stat-tile"><div class="s-label">Scams Detected</div>
          <div class="s-value" style="color:var(--crit)">${stats.fakes.toLocaleString("en-IN")}</div>
          <div class="s-hint">trust score ≤ 45</div></div>
        <div class="glass stat-tile"><div class="s-label">Blocklist Identifiers</div>
          <div class="s-value" style="color:var(--hl-ink)">${stats.libraryEntries.toLocaleString("en-IN")}</div>
          <div class="s-hint">phones · UPI · domains</div></div>
        <div class="glass stat-tile"><div class="s-label">Companies Tracked</div>
          <div class="s-value" style="color:var(--accent-text)">${stats.companies.toLocaleString("en-IN")}</div>
          <div class="s-hint">ledger + verified registry</div></div>
      </section>

      <!-- SIX PILLARS -->
      <section>
        <div class="eyebrow">Technical Defensibility</div>
        <h2 class="sec-title">Six pillars a raw AI chat can't replicate</h2>
        <p class="sec-sub" style="margin-bottom:24px">Generic LLM interfaces treat every question as an isolated event starting from zero. Argonaut is architected as an integrated, proactive, accumulative system.</p>
        <div class="grid grid-3">
          ${[
            ["🧬", "Instant Duplicate Detection", "Scam posts are copy-pasted across hundreds of channels. Argonaut normalizes text into locality-sensitive SimHash fingerprints — recurring posts match in milliseconds with zero AI inference cost, plus public context like “flagged 340× this week.”"],
            ["🏛", "Persistent Company Trust Scores", "A relational ledger maps every verified scan to company entities. Repeat offenders accumulate flags across independent scans and their global Trust Rating updates dynamically — a network effect that compounds with scale."],
            ["🖼", "Perceptual Screenshot Fingerprinting", "Scammers recycle the same fake offer letters and WhatsApp screenshots. Perceptual hashing (dHash) recognizes recycled scam images even when cropped, resized, or recolored — bypassing costly vision-model calls."],
            ["🧩", "Proactive Browser Integration", "A lightweight extension injects contextual trust badges directly into LinkedIn and Naukri feeds while you browse — no copying, no context-switching, no prompting. Safety comes to you. <span class='chip cyan' style='margin-top:8px'>In development</span>"],
            ["🗺", "Geospatial Scam Trend Mapping", "Telemetry across thousands of lookups reveals macro anomalies — like a sudden vector of fake logistics hiring in Bengaluru — and pushes perimeter warnings to localized user clusters before they encounter the threat."],
            ["🏭", "Institutional Batch Pipelines", "Placement cells and HR compliance teams aren't bottlenecked by single-query chat. Async pipeline workers ingest spreadsheets of hundreds of job links and return structured, multi-variable hazard reports."],
          ].map(([i, t, b]) => `
          <div class="glass feature-card"><div class="f-icon">${i}</div><h3>${t}</h3><p>${b}</p></div>`).join("")}
        </div>
      </section>

      <!-- HOW IT WORKS -->
      <section>
        <div class="eyebrow">The Engine</div>
        <h2 class="sec-title">How a scan works</h2>
        <div class="grid grid-3" style="margin-top:20px">
          ${[
            ["01", "Fingerprint first", "Your post is normalized and SimHash-fingerprinted on-device. Known posts return instantly from the intelligence DB — free, private, milliseconds."],
            ["02", "On-device fraud analysis", "Unknown posts run through the Argus ensemble: 20+ India-specific fraud signals, engagement-bait detection, and a false-positive guard that separates spammy recruiters from actual scams — all in your browser."],
            ["03", "Calibrated trust score", "The on-device ensemble weighs every signal — official ATS links, corporate domains, and role specifics against fraud markers — and returns a 0–100 trust score with the full evidence trail."],
          ].map(([n, t, b]) => `
          <div class="glass feature-card">
            <div class="mono" style="font-size:26px;font-weight:700;color:var(--accent-faint);margin-bottom:10px">${n}</div>
            <h3>${t}</h3><p>${b}</p>
          </div>`).join("")}
        </div>
      </section>

      <!-- FEATURE MATRIX -->
      <section>
        <div class="eyebrow">Feature Architecture</div>
        <h2 class="sec-title">Three pillars, one safety ecosystem</h2>
        <div class="grid grid-3" style="margin-top:20px">
          <div class="glass card-pad">
            <div class="card-label">🤝 Community &amp; Verification</div>
            ${featList([
              ["User-Contributed Scam Library", "Crowd-sourced blocklist of fraudulent phone numbers, UPI handles, and domains — cross-checked on every scan.", "intel"],
              ["“Verified Employer” Badges", "Authorized corporates link official feeds, placing trust anchors on authentic posts.", "intel"],
              ["Crowdsourced Trust Ecosystem", "Applicant experience sentiment feeds the company trust ledger.", "intel"],
            ])}
          </div>
          <div class="glass card-pad">
            <div class="card-label">🛡 Proactive Safety-First</div>
            ${featList([
              ["Contextual Feed Injection", "Browser extension inserts risk indicators directly onto external job cards. (In development)", null],
              ["Safe Learning Hub", "Interactive micro-modules and a spot-the-scam simulator that build cognitive defenses.", "learn"],
              ["Macro Telemetry Alerts", "Location-bound warnings when analytics spot coordinated regional fraud clusters.", "dashboard"],
            ])}
          </div>
          <div class="glass card-pad">
            <div class="card-label">💼 Workflow &amp; Professional</div>
            ${featList([
              ["Placement Cell B2B Dashboard", "Bulk-screening of student internship pipelines with exportable hazard reports.", "batch"],
              ["Secure Applicant Vault", "Track exactly what personal data you shared with whom — with risk warnings.", "intel"],
              ["Interview Panic Button", "Instant legitimacy check on any interview link, video-call domain, or document.", "panic"],
            ])}
          </div>
        </div>
      </section>

      <!-- PRICING -->
      <section id="pricing">
        <div class="eyebrow">Commercial Infrastructure</div>
        <h2 class="sec-title">Pricing built for the mission</h2>
        <p class="sec-sub" style="margin-bottom:24px">Validation phase: India-first via Razorpay/Cashfree settlement. Growth phase: UAE Free Zone entity unlocks frictionless global billing across the GCC. Spend thresholds and API quota ceilings are enforced at every tier — traffic anomalies degrade gracefully, never into uncapped liability.</p>
        <div class="grid grid-3">
          <div class="glass price-card">
            <div class="p-name">SEEKER</div>
            <div><span class="p-price">₹0</span> <span class="p-per">forever</span></div>
            <ul>
              <li>Unlimited duplicate-detection lookups</li>
              <li>Unlimited on-device AI scans (no key, always free)</li>
              <li>Community scam library access &amp; reporting</li>
              <li>Learning Hub + Interview Panic Button</li>
              <li>On-device applicant vault</li>
            </ul>
            <button class="btn-ghost" data-go="scanner">Start free</button>
          </div>
          <div class="glass price-card featured">
            <div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%)"><span class="chip accent">Most Popular</span></div>
            <div class="p-name">PLACEMENT CELL</div>
            <div><span class="p-price">₹2,000</span> <span class="p-per">/ month</span></div>
            <ul>
              <li>Batch pipelines — hundreds of links per run</li>
              <li>Institutional dashboard &amp; hazard reports</li>
              <li>Student-facing telemetry alerts</li>
              <li>Hosted batch throughput &amp; team seats</li>
              <li>Priority support · DPDP-compliant audit exports</li>
            </ul>
            <a class="btn-primary" href="mailto:sales@argonaut.ai?subject=Placement%20Cell%20Plan">Contact sales</a>
          </div>
          <div class="glass price-card">
            <div class="p-name">ENTERPRISE / HR</div>
            <div><span class="p-price">Custom</span></div>
            <ul>
              <li>Verified Employer badge program (API feed)</li>
              <li>Brand-impersonation monitoring</li>
              <li>Compliance branch integrations</li>
              <li>GCC / Dubai entity billing corridors</li>
              <li>SLA + dedicated intelligence analyst</li>
            </ul>
            <a class="btn-ghost" href="mailto:sales@argonaut.ai?subject=Enterprise%20Plan">Talk to us</a>
          </div>
        </div>
      </section>

      <!-- COMPLIANCE -->
      <section>
        <div class="eyebrow">Regulatory &amp; Ethical Guardrails</div>
        <h2 class="sec-title">Safety advisory, engineered responsibly</h2>
        <div class="grid grid-3" style="margin-top:20px">
          <div class="glass feature-card"><div class="f-icon">🇮🇳</div><h3>DPDP Act 2023 Compliance</h3>
            <p>Itemized, withdrawable consent before any processing. Strict purpose limitation is hardcoded: your posts and resume metadata are never repurposed or exposed to third-party model training. Your data lives on your device — export or erase it anytime in Settings.</p></div>
          <div class="glass feature-card"><div class="f-icon">⚖️</div><h3>Algorithmic Disclaimers</h3>
            <p>Trust scores are probabilistic advisories, not legal declarations of criminal activity. Every verdict carries confidence levels and a false-positive reporting path — positioning Argonaut clearly as a safety advisory framework.</p></div>
          <div class="glass feature-card"><div class="f-icon">🧾</div><h3>Audit Trails</h3>
            <p>Every flag issued is backed by a logged evidence trail — fingerprint checks, search queries, model responses, score computations — so any determination can be referenced against an explicit diagnostic record if challenged.</p></div>
        </div>
      </section>

      <!-- ROADMAP -->
      <section class="glass card-pad" style="text-align:center">
        <div class="eyebrow" style="justify-content:center">Scale Vector</div>
        <h2 class="sec-title" style="margin-bottom:18px">India validation → Dubai scale-out</h2>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:13.5px;color:var(--ink-2)">
          <div class="glass-flat" style="padding:14px 20px;border-radius:12px"><b style="color:var(--ink)">Phase 1 · Months 1–3</b><br>Web MVP · India student &amp; entry-level ecosystems · lean ops on cloud free tier</div>
          <div style="align-self:center;color:var(--accent-2);font-size:20px">→</div>
          <div class="glass-flat" style="padding:14px 20px;border-radius:12px"><b style="color:var(--ink)">Phase 2 · Growth</b><br>UAE Free Zone entity (Meydan / IFZA / Dtec) · 100% ownership · GCC market access</div>
        </div>
      </section>
    </div>`;
    view.querySelectorAll("[data-go]").forEach(el =>
      el.addEventListener("click", () => Argus.app.go(el.dataset.go)));
  }

  function featList(items) {
    return items.map(([t, b, go]) => `
      <div style="padding:11px 0;border-bottom:1px solid var(--neutral-border)">
        <div style="font-size:13.5px;font-weight:600;color:var(--ink);margin-bottom:3px">
          ${go ? `<a style="color:inherit;cursor:pointer" data-go="${go}">${t} ›</a>` : t}
        </div>
        <div style="font-size:12.5px;color:var(--ink-2);line-height:1.6">${b}</div>
      </div>`).join("");
  }

  /* ═══ DASHBOARD ════════════════════════════════════════ */
  function renderDashboard() {
    const view = document.getElementById("view");
    const stats = S.stats();
    const dist = S.verdictDist();
    const trend = S.trendSeries();
    const hotspots = S.hotspots();
    const scansForAvg = S.getScans();
    const avgScore = scansForAvg.length
      ? Math.round(scansForAvg.reduce((a, s) => a + ((s.result && s.result.trust_score) || 0), 0) / scansForAvg.length)
      : null;
    const totalVerdicts = dist.LEGITIMATE + dist.ENGAGEMENT_BAIT + dist.SUSPICIOUS + dist.ACTUAL_SCAM;
    // Threat level derived from this device's real scan outcomes
    const ratio = stats.scanned ? stats.fakes / stats.scanned : 0;
    const threat = !stats.scanned
      ? { label: "STANDBY", color: "var(--ink-3)", hint: "populates with your first scan" }
      : ratio >= .5  ? { label: "HIGH",     color: "var(--crit)", hint: `${Math.round(ratio * 100)}% of scans flagged` }
      : ratio >= .25 ? { label: "ELEVATED", color: "var(--warn)", hint: `${Math.round(ratio * 100)}% of scans flagged` }
      :                { label: "LOW",      color: "var(--good)", hint: `${Math.round(ratio * 100)}% of scans flagged` };

    view.innerHTML = `
    <div class="container">
      <section class="fadeup" style="margin-bottom:24px;padding-top:8px">
        <div class="eyebrow">Telemetry · <span class="pulse-dot"></span> Live</div>
        <h2 class="sec-title">Scam Intelligence Dashboard</h2>
        <p class="sec-sub">Verification analytics computed from scans performed on this device, alongside curated network threat advisories.</p>
      </section>

      <section class="grid grid-4 fadeup">
        <div class="glass stat-tile"><div class="s-label">Posts Verified</div>
          <div class="s-value">${stats.scanned.toLocaleString("en-IN")}</div>
          <div class="s-hint">on this device</div></div>
        <div class="glass stat-tile"><div class="s-label">Scams Detected</div>
          <div class="s-value" style="color:var(--crit)">${stats.fakes.toLocaleString("en-IN")}</div>
          <div class="s-hint">${stats.scanned ? Math.round(ratio * 100) + "% of your scans" : "trust score ≤ 45"}</div></div>
        <div class="glass stat-tile"><div class="s-label">Threat Level</div>
          <div class="s-value" style="color:${threat.color}">${threat.label}</div>
          <div class="s-hint">${threat.hint}</div></div>
        <div class="glass stat-tile"><div class="s-label">Avg Trust Score</div>
          <div class="s-value" style="color:${avgScore == null ? "var(--ink-3)" : Argus.scoreStyle(avgScore).color}">${avgScore == null ? "—" : avgScore}</div>
          <div class="s-hint">${avgScore == null ? "run a scan first" : "across your scans"}</div></div>
      </section>

      <section class="grid grid-2">
        <div class="glass card-pad">
          <div class="card-label">📈 Scan Volume — last 14 days</div>
          <div id="trend-chart"></div>
        </div>
        <div class="glass card-pad">
          <div class="card-label">⚖️ Verdict Distribution — your analyses</div>
          <div id="verdict-chart" style="padding-top:6px"></div>
        </div>
      </section>

      <section class="grid grid-2">
        <div class="glass card-pad">
          <div class="card-label">🗺 Regional Activity — your scans by location</div>
          <div id="hotspot-chart" style="padding-top:6px"></div>
        </div>
        <div class="glass card-pad">
          <div class="card-label">🚨 Network Threat Advisories</div>
          ${Argus.SEED_ALERTS.map(a => `
            <div class="flag-row" style="background:var(--row-bg);border:1px solid var(--border)">
              <span class="chip ${a.severity}" style="flex-shrink:0;margin-top:2px">${a.severity === "crit" ? "🔴 Critical" : a.severity === "serious" ? "🟠 Serious" : "🟡 Watch"}</span>
              <div><div class="fr-title">${esc(a.title)}</div>
                <div class="fr-sub">${esc(a.detail)}</div></div>
            </div>`).join("")}
          <div style="font-size:11.5px;color:var(--ink-3);margin-top:10px">Curated advisories from the Argonaut threat-intelligence feed.</div>
        </div>
      </section>
    </div>`;

    const trendEl = document.getElementById("trend-chart");
    if (trend.total > 0) C.sparkline(trendEl, trend);
    else trendEl.innerHTML = `<div class="chart-empty">📈 <b>No scan activity yet.</b><br>Volume trends appear here as you verify posts.</div>`;

    const hotEl = document.getElementById("hotspot-chart");
    if (hotspots.length) C.hbars(hotEl, hotspots.map(h => ({ label: h.city, value: h.count, detail: "scans" })), { unit: "scans" });
    else hotEl.innerHTML = `<div class="chart-empty">🗺 <b>No regional data yet.</b><br>City-level activity appears when scanned posts mention a location (requires telemetry consent).</div>`;

    const verEl = document.getElementById("verdict-chart");
    if (totalVerdicts > 0) C.hbars(verEl, [
      { label: "Legitimate", value: dist.LEGITIMATE, color: "var(--good)", icon: "✅" },
      { label: "Engagement Bait", value: dist.ENGAGEMENT_BAIT, color: "var(--warn)", icon: "🎣" },
      { label: "Suspicious", value: dist.SUSPICIOUS, color: "var(--serious)", icon: "🔎" },
      { label: "Actual Scam", value: dist.ACTUAL_SCAM, color: "var(--crit)", icon: "🚨" },
    ], { unit: "posts" });
    else verEl.innerHTML = `<div class="chart-empty">⚖️ <b>No verdicts yet.</b><br>Run your first scan and the distribution builds here.</div>`;
  }

  /* ═══ INTELLIGENCE (Ledger · Library · Vault · Audit) ══ */
  const intelState = { tab: "companies", companyQ: "", libQ: "" };

  function renderIntel() {
    const view = document.getElementById("view");
    const t = intelState.tab;
    view.innerHTML = `
    <div class="container" style="max-width:980px">
      <section class="fadeup" style="margin-bottom:22px;padding-top:8px">
        <div class="eyebrow">Accumulative Intelligence</div>
        <h2 class="sec-title">Intelligence Hub</h2>
        <p class="sec-sub">The proprietary data moat: persistent company trust scores, the community scam library, your applicant vault, and the full audit trail.</p>
      </section>
      <div class="tabs" style="max-width:640px">
        ${[["companies", "🏛 Company Ledger"], ["library", "🚨 Scam Library"], ["vault", "🔐 Applicant Vault"], ["audit", "🧾 Audit Trail"]]
          .map(([id, label]) => `<button class="tab ${t === id ? "on" : ""}" data-intel-tab="${id}">${label}</button>`).join("")}
      </div>
      <div id="intel-body">${t === "companies" ? companiesHTML() : t === "library" ? libraryHTML() : t === "vault" ? vaultHTML() : auditHTML()}</div>
    </div>`;
    view.querySelectorAll("[data-intel-tab]").forEach(b =>
      b.addEventListener("click", () => { intelState.tab = b.dataset.intelTab; renderIntel(); }));
    wireIntel();
  }

  function trustChip(score) {
    const s = Argus.scoreStyle(score);
    const label = score >= 66 ? "Trusted" : score >= 46 ? "Mixed" : score >= 26 ? "Risky" : "Dangerous";
    return `<span class="chip" style="color:${s.color};border:1px solid ${s.color}55;background:${s.color}12">${score} · ${label}</span>`;
  }

  function companiesHTML() {
    const q = intelState.companyQ.toLowerCase();
    const rows = S.companyLedger().filter(c => !q || c.name.toLowerCase().includes(q));
    return `
    <div class="glass card-pad fadeup">
      <input class="input-text" id="company-q" placeholder="Search companies…" value="${esc(intelState.companyQ)}" style="max-width:320px;margin-bottom:16px"/>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Company</th><th>Status</th><th>Scans</th><th>Trust Rating</th><th>Flags</th></tr></thead>
        <tbody>${rows.map(c => `
          <tr>
            <td>${esc(c.name)}${c.local ? ' <span class="chip cyan" style="font-size:9px">scanned</span>' : ' <span class="chip neutral" style="font-size:9px">registry</span>'}</td>
            <td>${c.verified ? '<span class="badge-verified">✔ Verified Employer</span>' : '<span class="chip neutral">Unverified</span>'}</td>
            <td class="mono">${c.scans ? c.scans.toLocaleString("en-IN") : "—"}</td>
            <td>${c.avgScore == null ? '<span class="chip neutral">No scans yet</span>' : trustChip(c.avgScore)}</td>
            <td class="mono" style="color:${c.flags > c.scans / 2 && c.scans ? "var(--crit)" : "var(--ink-2)"}">${c.scans ? c.flags.toLocaleString("en-IN") : "—"}</td>
          </tr>`).join("") || '<tr><td colspan="5" style="text-align:center;color:var(--ink-3)">No matches</td></tr>'}
        </tbody>
      </table></div>
      <div style="font-size:11.5px;color:var(--ink-3);margin-top:14px;line-height:1.6">
        Trust ratings update dynamically as independent scans accumulate. Verified Employer badges are granted through the B2B portal where corporates link official careers API feeds. Ratings are probabilistic advisories, not legal determinations.
      </div>
    </div>`;
  }

  function libraryHTML() {
    const q = intelState.libQ.toLowerCase();
    const rows = S.scamLibrary().filter(e => !q || e.value.toLowerCase().includes(q) || (e.note || "").toLowerCase().includes(q));
    const icons = { phone: "📱", upi: "💳", email: "📧", website: "🌐" };
    return `
    <div class="grid" style="grid-template-columns:340px 1fr;gap:16px;align-items:start" id="lib-grid">
      <div class="glass card-pad fadeup">
        <div class="card-label">➕ Report a scam identifier</div>
        <label class="f-label">Type</label>
        <select class="input-text" id="lib-type" style="margin-bottom:12px">
          <option value="phone">📱 Phone number</option>
          <option value="upi">💳 UPI handle</option>
          <option value="email">📧 Email / domain</option>
          <option value="website">🌐 Website</option>
        </select>
        <label class="f-label">Identifier</label>
        <input class="input-text" id="lib-value" placeholder="e.g. scammer@ybl" style="margin-bottom:12px"/>
        <label class="f-label">What happened?</label>
        <input class="input-text" id="lib-note" placeholder="e.g. Demanded ₹500 registration fee" style="margin-bottom:14px"/>
        <button class="btn-primary btn-sm" id="lib-add" style="width:100%">Add to community blocklist</button>
        <div style="font-size:11px;color:var(--ink-3);margin-top:10px;line-height:1.6">Every scan is cross-checked against this blocklist. Also report financial fraud at <a href="https://cybercrime.gov.in" target="_blank" rel="noopener">cybercrime.gov.in</a>.</div>
      </div>
      <div class="glass card-pad fadeup">
        <input class="input-text" id="lib-q" placeholder="Search the library…" value="${esc(intelState.libQ)}" style="margin-bottom:14px"/>
        ${rows.map(e => `
          <div class="flag-row" style="background:var(--row-bg);border:1px solid var(--border)">
            <span style="font-size:18px;flex-shrink:0">${icons[e.type] || "❓"}</span>
            <div style="flex:1">
              <div class="fr-title mono">${esc(e.value)}</div>
              <div class="fr-sub">${esc(e.note || "")}</div>
            </div>
            ${e.seeded
              ? '<span class="chip cyan" style="flex-shrink:0">Network feed</span>'
              : `<span class="chip crit" style="flex-shrink:0">Your report${e.reports > 1 ? ` ×${e.reports}` : ""}</span>`}
          </div>`).join("") || '<div style="color:var(--ink-3);text-align:center;padding:20px">No entries match</div>'}
      </div>
    </div>
    <style>@media(max-width:760px){#lib-grid{grid-template-columns:1fr!important}}</style>`;
  }

  function vaultHTML() {
    const entries = S.getVault();
    const DATA_OPTS = ["Resume", "Phone", "Email", "Photo", "Aadhaar", "PAN", "Bank details"];
    return `
    <div class="grid" style="grid-template-columns:340px 1fr;gap:16px;align-items:start" id="vault-grid">
      <div class="glass card-pad fadeup">
        <div class="card-label">➕ Log an application</div>
        <label class="f-label">Company</label>
        <input class="input-text" id="vault-company" placeholder="Company name" style="margin-bottom:12px"/>
        <label class="f-label">Role</label>
        <input class="input-text" id="vault-role" placeholder="Role applied for" style="margin-bottom:12px"/>
        <label class="f-label">Data you shared</label>
        <div style="display:flex;flex-wrap:wrap;gap:7px;margin:4px 0 14px">
          ${DATA_OPTS.map(d => `<label class="chip neutral" style="cursor:pointer;text-transform:none;letter-spacing:0"><input type="checkbox" value="${d}" class="vault-data" style="accent-color:#6d7cff;margin-right:2px"/>${d}</label>`).join("")}
        </div>
        <button class="btn-primary btn-sm" id="vault-add" style="width:100%">Save to vault</button>
        <div style="font-size:11px;color:var(--ink-3);margin-top:10px;line-height:1.6">Stored only on this device (DPDP purpose-limitation). The vault warns you when a company you shared sensitive data with turns risky.</div>
      </div>
      <div class="glass card-pad fadeup">
        <div class="card-label">🔐 Your applications (${entries.length})</div>
        ${entries.length ? entries.map(e => {
          const rec = S.companyRecord(e.company);
          const sensitive = (e.shared || []).some(d => ["Aadhaar", "PAN", "Bank details"].includes(d));
          const risky = rec && rec.scans > 0 && rec.avgScore != null && rec.avgScore < 40;
          return `
          <div class="flag-row" style="background:var(--row-bg);border:1px solid ${risky && sensitive ? "var(--crit-border)" : "var(--border)"}">
            <span style="font-size:18px;flex-shrink:0">${risky ? "⚠️" : "🗂"}</span>
            <div style="flex:1">
              <div class="fr-title">${esc(e.company)} — ${esc(e.role || "role n/a")}</div>
              <div class="fr-sub">Shared: ${(e.shared || []).join(", ") || "nothing logged"} · ${new Date(e.ts).toLocaleDateString("en-IN")}</div>
              ${risky ? `<div style="font-size:12px;color:var(--crit);margin-top:4px">⚠ This company's network trust rating is ${rec.avgScore}/100${sensitive ? " and you shared sensitive identity data — monitor for misuse and consider filing at cybercrime.gov.in" : ""}.</div>` : ""}
              ${rec && rec.avgScore != null ? `<div style="margin-top:5px">${trustChip(rec.avgScore)}</div>` : ""}
            </div>
            <button class="btn-ghost btn-sm vault-del" data-id="${e.id}" style="flex-shrink:0">✕</button>
          </div>`;
        }).join("") : '<div style="color:var(--ink-3);text-align:center;padding:24px">No applications logged yet. Track what you share — it’s your early-warning system.</div>'}
      </div>
    </div>
    <style>@media(max-width:760px){#vault-grid{grid-template-columns:1fr!important}}</style>`;
  }

  function auditHTML() {
    const log = S.auditLog().slice(0, 120);
    return `
    <div class="glass card-pad fadeup">
      <div class="card-label">🧾 Diagnostic evidence log — last ${log.length} entries</div>
      <div style="font-size:12px;color:var(--ink-2);margin-bottom:14px;line-height:1.6">Every safety determination is backed by an explicit trail (intermediary-protection guardrail). Stored on-device; export via Settings.</div>
      ${log.length ? `<div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Time</th><th>Scan</th><th>Step</th><th>Detail</th></tr></thead>
        <tbody>${log.map(e => `
          <tr>
            <td class="mono" style="white-space:nowrap">${new Date(e.ts).toLocaleString("en-IN")}</td>
            <td class="mono" style="font-size:11px">${esc((e.scanId || "").slice(0, 12))}</td>
            <td><span class="chip ${e.step === "ERROR" ? "crit" : e.step === "CACHE_HIT" ? "cyan" : e.step === "COMMUNITY_MATCH" ? "warn" : "neutral"}" style="font-size:9px">${esc(e.step)}</span></td>
            <td style="font-size:12.5px">${esc(e.detail)}</td>
          </tr>`).join("")}
        </tbody></table></div>`
      : '<div style="color:var(--ink-3);text-align:center;padding:24px">No audit entries yet — run a scan first.</div>'}
    </div>`;
  }

  function wireIntel() {
    const $ = id => document.getElementById(id);
    if ($("company-q")) $("company-q").addEventListener("input", e => {
      intelState.companyQ = e.target.value;
      const body = document.getElementById("intel-body");
      body.innerHTML = companiesHTML();
      wireIntel();
      const inp = $("company-q"); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
    });
    if ($("lib-q")) $("lib-q").addEventListener("input", e => {
      intelState.libQ = e.target.value;
      const body = document.getElementById("intel-body");
      body.innerHTML = libraryHTML();
      wireIntel();
      const inp = $("lib-q"); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
    });
    if ($("lib-add")) $("lib-add").addEventListener("click", () => {
      const value = $("lib-value").value.trim();
      if (value.length < 4) { Argus.app.toast("Enter a valid identifier (4+ characters)"); return; }
      S.addScamReport({ type: $("lib-type").value, value, note: $("lib-note").value.trim() });
      Argus.app.toast("Added to the community blocklist — every future scan checks it");
      renderIntel();
    });
    if ($("vault-add")) $("vault-add").addEventListener("click", () => {
      const company = $("vault-company").value.trim();
      if (!company) { Argus.app.toast("Enter the company name"); return; }
      const shared = [...document.querySelectorAll(".vault-data:checked")].map(c => c.value);
      S.addVaultEntry({ company, role: $("vault-role").value.trim(), shared });
      Argus.app.toast("Saved to your on-device vault");
      renderIntel();
    });
    document.querySelectorAll(".vault-del").forEach(b =>
      b.addEventListener("click", () => { S.removeVaultEntry(b.dataset.id); renderIntel(); }));
  }

  /* ═══ LEARN HUB ════════════════════════════════════════ */
  const quizState = { i: 0, score: 0, answered: false, finished: false };

  function renderLearn() {
    const view = document.getElementById("view");
    const learn = S.getLearn();
    view.innerHTML = `
    <div class="container" style="max-width:980px">
      <section class="fadeup" style="margin-bottom:24px;padding-top:8px">
        <div class="eyebrow">Safe Learning Hub</div>
        <h2 class="sec-title">Build cognitive defenses</h2>
        <p class="sec-sub">Interactive micro-modules and a simulated scam environment — because the strongest firewall is a trained eye. ${learn.quizBest != null ? `Your best simulator score: <b style="color:var(--accent-2)">${learn.quizBest}/${Argus.QUIZ.length}</b>` : ""}</p>
      </section>

      <section class="grid grid-2 learn-grid" style="margin-bottom:34px">
        ${Argus.LEARN_MODULES.map((m, idx) => `
        <div class="glass learn-card" data-learn-card="${idx}">
          <button class="learn-head" data-learn-toggle="${idx}" aria-expanded="false">
            <span class="learn-ico" aria-hidden="true">${m.icon}</span>
            <span class="learn-title">${esc(m.title)}</span>
            ${learn.done.includes(idx) ? '<span class="chip good">✓ Done</span>' : '<span class="chip neutral">5 min</span>'}
            <svg class="learn-chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="learn-body">
            <div class="learn-body-inner">
              <div class="learn-body-pad">
                <div style="font-size:13.5px;color:var(--ink-2);line-height:1.7">${esc(m.body)}</div>
                <div style="margin-top:12px">
                  ${m.tips.map(t => `<div style="display:flex;gap:8px;font-size:13px;color:var(--ink-2);padding:4px 0"><span style="color:var(--good)">✓</span>${esc(t)}</div>`).join("")}
                </div>
                <button class="btn-ghost btn-sm mark-done" data-idx="${idx}" style="margin-top:14px">${learn.done.includes(idx) ? "Completed ✓" : "Mark as completed"}</button>
              </div>
            </div>
          </div>
        </div>`).join("")}
      </section>

      <section class="glass card-pad" id="quiz-box">
        ${quizHTML()}
      </section>
    </div>`;
    /* Accordion: only the clicked card opens, siblings stay put */
    view.querySelectorAll("[data-learn-toggle]").forEach(btn => btn.addEventListener("click", () => {
      const card = btn.closest(".learn-card");
      const wasOpen = card.classList.contains("open");
      view.querySelectorAll(".learn-card.open").forEach(c => {
        c.classList.remove("open");
        c.querySelector(".learn-head").setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) { card.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    }));
    /* Complete in place — no full re-render, so the open card stays open */
    view.querySelectorAll(".mark-done").forEach(b => b.addEventListener("click", () => {
      const l = S.getLearn();
      const idx = Number(b.dataset.idx);
      if (!l.done.includes(idx)) l.done.push(idx);
      S.setLearn(l);
      b.textContent = "Completed ✓";
      const chip = b.closest(".learn-card").querySelector(".learn-head .chip");
      if (chip) { chip.className = "chip good"; chip.textContent = "✓ Done"; }
    }));
    wireQuiz();
  }

  function quizHTML() {
    if (quizState.finished) {
      const total = Argus.QUIZ.length;
      return `
      <div style="text-align:center;padding:14px">
        <div style="font-size:40px;margin-bottom:10px">${quizState.score === total ? "🏆" : quizState.score >= total - 1 ? "🎖" : "📖"}</div>
        <h3 style="font-family:var(--font-display);font-size:22px;margin-bottom:8px">You scored ${quizState.score}/${total}</h3>
        <p style="color:var(--ink-2);font-size:14px;margin-bottom:18px">${quizState.score === total ? "Perfect — you have a trained eye. Share what you know with your batch." : "Review the modules above and try again — scammers only need you to miss once."}</p>
        <button class="btn-primary btn-sm" id="quiz-restart">↻ Run the simulator again</button>
      </div>`;
    }
    const q = Argus.QUIZ[quizState.i];
    return `
    <div class="card-label">🎮 Spot-the-Scam Simulator — post ${quizState.i + 1} of ${Argus.QUIZ.length} · score ${quizState.score}</div>
    <div class="glass-flat" style="padding:18px;border-radius:13px;margin-bottom:16px;font-size:14px;line-height:1.7;color:var(--ink);white-space:pre-wrap">${esc(q.post)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" id="quiz-opts">
      <button class="quiz-opt" data-ans="scam" style="text-align:center;font-weight:700">🚨 Scam</button>
      <button class="quiz-opt" data-ans="legit" style="text-align:center;font-weight:700">✅ Legitimate</button>
    </div>
    <div id="quiz-expl"></div>`;
  }

  function wireQuiz() {
    const box = document.getElementById("quiz-box");
    if (!box) return;
    const restart = document.getElementById("quiz-restart");
    if (restart) restart.addEventListener("click", () => {
      Object.assign(quizState, { i: 0, score: 0, answered: false, finished: false });
      box.innerHTML = quizHTML(); wireQuiz();
    });
    box.querySelectorAll(".quiz-opt").forEach(b => b.addEventListener("click", () => {
      if (quizState.answered) return;
      quizState.answered = true;
      const q = Argus.QUIZ[quizState.i];
      const right = b.dataset.ans === q.answer;
      if (right) quizState.score++;
      box.querySelectorAll(".quiz-opt").forEach(o => {
        if (o.dataset.ans === q.answer) o.classList.add("correct");
        else if (o === b) o.classList.add("wrong");
      });
      document.getElementById("quiz-expl").innerHTML = `
        <div class="glass-flat" style="padding:14px 16px;border-radius:11px;margin-top:14px;font-size:13px;line-height:1.65;color:var(--ink-2);border-color:${right ? "var(--good-border)" : "var(--crit-border)"}">
          <b style="color:${right ? "var(--good)" : "var(--crit)"}">${right ? "Correct." : "Not quite."}</b> ${esc(q.why)}
        </div>
        <button class="btn-primary btn-sm" id="quiz-next" style="margin-top:14px">${quizState.i === Argus.QUIZ.length - 1 ? "See results →" : "Next post →"}</button>`;
      document.getElementById("quiz-next").addEventListener("click", () => {
        quizState.answered = false;
        if (quizState.i === Argus.QUIZ.length - 1) {
          quizState.finished = true;
          const l = S.getLearn();
          if (l.quizBest == null || quizState.score > l.quizBest) l.quizBest = quizState.score;
          S.setLearn(l);
        } else quizState.i++;
        box.innerHTML = quizHTML(); wireQuiz();
      });
    }));
  }

  Argus.views = { renderHome, renderDashboard, renderIntel, renderLearn };
})();
