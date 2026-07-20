/* ═══════════════════════════════════════════════════════════
   ARGONAUT — App Shell: router · modals · panic button · fx
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

(function () {
  const S = Argus.store;
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /* ── Router ─────────────────────────────────────────── */
  const ROUTES = {
    home:      () => Argus.landing.show(),
    scanner:   () => Argus.scanner.render(),
    dashboard: () => Argus.views.renderDashboard(),
    intel:     () => Argus.views.renderIntel(),
    batch:     () => Argus.scanner.renderBatch(),
    learn:     () => Argus.views.renderLearn(),
  };
  function route() {
    const h = (location.hash || "#/home").replace(/^#\/?/, "").split("?")[0];
    return ROUTES[h] ? h : "home";
  }
  function go(r) {
    if (r === "panic") { openPanic(); return; }
    location.hash = "#/" + r;
  }
  /* ── Route motion — the landing's choreography, app-wide.
     Old content lifts away (power2.in), then the new view's
     sections cascade up with the same stagger/easing as the
     landing exhibit panels (power3.out). Falls back to the
     CSS .fadeup animation when GSAP/motion is unavailable. */
  const REDUCED_MOTION = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastRoute = null;

  function staggerViewIn() {
    const view = document.getElementById("view");
    let els = Array.from(view.querySelectorAll(".container > *"));
    if (!els.length) els = Array.from(view.children);
    if (!els.length) return;
    // GSAP owns this entrance — drop the CSS .fadeup fallback from these
    // elements so they don't double-animate. Later internal re-renders
    // (tab switches, scan results) recreate nodes with .fadeup intact.
    els.forEach(el => el.classList && el.classList.remove("fadeup"));
    gsap.fromTo(els,
      { autoAlpha: 0, y: 34 },
      { autoAlpha: 1, y: 0, duration: .8, stagger: .08, ease: "power3.out",
        overwrite: "auto", clearProps: "transform,opacity,visibility" });
  }

  function renderRoute() {
    const r = route();
    document.querySelectorAll(".nav-link").forEach(el =>
      el.classList.toggle("on", el.dataset.route === r));
    if (r !== "home") Argus.landing.ambient();   // canvas persists as scroll-reactive background
    const view = document.getElementById("view");
    const animate = window.gsap && !REDUCED_MOTION && r !== "home";
    const doRender = () => {
      window.scrollTo({ top: 0 });
      ROUTES[r]();
      if (animate) staggerViewIn();
    };
    if (animate && lastRoute && lastRoute !== r && view.childElementCount) {
      gsap.to(view, {
        autoAlpha: 0, y: -18, duration: .22, ease: "power2.in", overwrite: "auto",
        onComplete: () => { gsap.set(view, { clearProps: "all" }); doRender(); },
      });
    } else doRender();
    lastRoute = r;
  }
  window.addEventListener("hashchange", renderRoute);

  /* ── Toast + clipboard ──────────────────────────────── */
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }
  function copyText(text, doneMsg) {
    const done = () => toast(doneMsg || "Copied to clipboard");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed — select and copy manually"); }
    document.body.removeChild(ta);
  }

  /* ── Modal helper ───────────────────────────────────── */
  const modalRoot = () => document.getElementById("modal-root");
  function closeModal() { modalRoot().innerHTML = ""; }
  function openModal(html, { dismissible = true } = {}) {
    modalRoot().innerHTML = `<div class="modal-backdrop" id="modal-bd"><div class="modal glass">${html}</div></div>`;
    if (dismissible) {
      document.getElementById("modal-bd").addEventListener("click", e => {
        if (e.target.id === "modal-bd") closeModal();
      });
    }
  }

  /* ═══ DPDP CONSENT ═════════════════════════════════════ */
  function openConsent() {
    openModal(`
      <h3>🇮🇳 Your data, your consent</h3>
      <div class="m-sub">Under the Digital Personal Data Protection Act, 2023, Argonaut asks for itemized, withdrawable consent before processing anything. Purpose limitation is hardcoded — your data is used for fraud analysis only, never for advertising or third-party model training.</div>
      <div class="glass-flat" style="padding:14px 16px;border-radius:12px;margin-bottom:10px;font-size:13px;line-height:1.6">
        <label style="display:flex;gap:10px;cursor:pointer;align-items:flex-start">
          <input type="checkbox" id="c-required" style="accent-color:#6d7cff;margin-top:3px"/>
          <span><b>Required — Analysis processing.</b> Posts and screenshots you submit are fingerprinted on this device; content unknown to the cache is sent to Argonaut's secure third-party AI processing service solely to generate a fraud analysis. Results and fingerprints are stored only in this browser.</span>
        </label>
      </div>
      <div class="glass-flat" style="padding:14px 16px;border-radius:12px;margin-bottom:18px;font-size:13px;line-height:1.6">
        <label style="display:flex;gap:10px;cursor:pointer;align-items:flex-start">
          <input type="checkbox" id="c-telemetry" checked style="accent-color:#6d7cff;margin-top:3px"/>
          <span><b>Optional — Local telemetry.</b> Aggregate anonymous counts (city-level hotspots, daily scan volume) into the on-device dashboard. No content leaves your browser for this.</span>
        </label>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-primary btn-sm" id="c-accept" style="flex:1">Accept &amp; continue</button>
        <button class="btn-ghost btn-sm" id="c-decline" style="flex:1">Not now</button>
      </div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:12px;line-height:1.6">You can withdraw consent, export, or erase all data at any time from Settings (⚙). Declining disables analysis but you can still browse the Learning Hub and dashboards.</div>
    `, { dismissible: false });
    document.getElementById("c-accept").addEventListener("click", () => {
      if (!document.getElementById("c-required").checked) {
        toast("Tick the required item to enable analysis — or choose Not now");
        return;
      }
      S.setConsent({
        accepted: true, version: Argus.CONFIG.CONSENT_VERSION,
        telemetry: document.getElementById("c-telemetry").checked, ts: Date.now(),
      });
      closeModal();
      toast("Consent recorded — you're protected. Withdraw anytime in Settings.");
      if (!Argus.engine.hasKey()) openSettings(true);
    });
    document.getElementById("c-decline").addEventListener("click", () => {
      S.setConsent({ accepted: false, version: Argus.CONFIG.CONSENT_VERSION, ts: Date.now() });
      closeModal();
    });
  }

  /* ═══ SETTINGS ═════════════════════════════════════════ */
  function openSettings(firstRun) {
    const s = S.getSettings();
    const consent = S.getConsent();
    openModal(`
      <h3>⚙ Settings</h3>
      <div class="m-sub">${firstRun ? "One last step — Argus needs an engine access key to run AI analysis. It's free." : "Engine configuration and your DPDP data rights."}</div>

      <label class="f-label">Engine access key</label>
      <input class="input-text" id="set-key" type="password" placeholder="Paste your access key…" value="${esc(s.apiKey || "")}" autocomplete="off" style="margin-bottom:6px"/>
      <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:16px;line-height:1.6">
        Create a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> — create it yourself and paste it here. The key is stored only in this browser and used only for analysis requests. Engine: <span class="mono">${Argus.CONFIG.ENGINE_LABEL} · search-grounded</span>.
      </div>

      <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:16px">
        Free tier: <b style="color:var(--ink)">${Argus.CONFIG.DAILY_QUOTA} AI scans per day</b> — duplicate-detection lookups stay unlimited.
      </div>

      <div class="card-label" style="margin-top:6px">🛡 DPDP Data Rights</div>
      <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:12px">
        Consent status: ${consent && consent.accepted ? `<span class="chip good">Granted ${new Date(consent.ts).toLocaleDateString("en-IN")}</span>` : '<span class="chip warn">Not granted</span>'}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        <button class="btn-ghost btn-sm" id="set-export">⬇ Export my data</button>
        <button class="btn-ghost btn-sm" id="set-consent">↻ Review consent</button>
        <button class="btn-danger-ghost btn-sm" id="set-erase">🗑 Erase everything</button>
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn-primary btn-sm" id="set-save" style="flex:1">Save settings</button>
        <button class="btn-ghost btn-sm" id="set-close">Close</button>
      </div>
    `);
    const $ = id => document.getElementById(id);
    $("set-save").addEventListener("click", () => {
      const st = S.getSettings();
      st.apiKey = $("set-key").value.trim();
      S.setSettings(st);
      closeModal();
      if (!st.apiKey) { toast("Saved — add an engine access key to enable AI scans"); return; }
      // No format assumptions (AI Studio issues AIza… and AQ.… keys) —
      // verify with a real engine round-trip instead.
      toast("Saved — verifying your engine key…");
      Argus.engine.validateKey(st.apiKey).then(v => {
        if (v.ok) toast("Key verified — Argus is armed 🔍");
        else if (v.reason === "rejected")
          toast("Saved, but the AI service rejected this key — re-copy the full key from Google AI Studio.");
        else if (v.reason === "network")
          toast("Saved — can't verify the key while offline. It will be checked on your first scan.");
        else
          toast("Saved — the AI service couldn't confirm the key right now. It will be checked on your first scan.");
      });
    });
    $("set-close").addEventListener("click", closeModal);
    $("set-export").addEventListener("click", () => {
      const blob = new Blob([S.exportAll()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "argonaut-data-export.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Full data export downloaded");
    });
    $("set-consent").addEventListener("click", () => { closeModal(); openConsent(); });
    $("set-erase").addEventListener("click", () => {
      if (confirm("Erase ALL Argonaut data on this device — scans, ledger, vault, audit trail, settings and API key? This cannot be undone.")) {
        S.eraseAll();
        closeModal();
        toast("All local data erased (DPDP right to erasure)");
        setTimeout(() => location.reload(), 800);
      }
    });
  }

  /* ═══ INTERVIEW PANIC BUTTON ═══════════════════════════ */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 99;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[m][n];
  }

  function checkLink(input) {
    const reasons = [];
    let raw = input.trim();
    if (!raw) return null;
    if (raw.includes("@") && !raw.includes("/") && !/^https?:/i.test(raw)) {
      raw = raw.split("@").pop(); // email → domain
      reasons.push({ t: "info", m: "Interpreting input as the domain of an email address." });
    }
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    let url;
    try { url = new URL(raw); } catch (e) {
      return { level: "CAUTION", headline: "Could not parse that as a link or domain", reasons: [{ t: "warn", m: "Check the address for typos and try again." }] };
    }
    const host = url.hostname.toLowerCase();
    let danger = 0, caution = 0;

    if (url.protocol === "http:") { caution++; reasons.push({ t: "warn", m: "Uses plain HTTP — legitimate interview platforms are always HTTPS." }); }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { danger++; reasons.push({ t: "bad", m: "Raw IP address instead of a domain — a classic phishing setup." }); }
    if (host.includes("xn--")) { danger++; reasons.push({ t: "bad", m: "Punycode characters detected — the address may visually impersonate another domain." }); }
    if (Argus.SUSPICIOUS_TLDS.some(t => host.endsWith(t))) { danger++; reasons.push({ t: "bad", m: `Suspicious top-level domain (${host.slice(host.lastIndexOf("."))}) — heavily abused by scam infrastructure and almost never used by real employers.` }); }
    if (Argus.URL_SHORTENERS.some(sh => host === sh || host.endsWith("." + sh))) { caution++; reasons.push({ t: "warn", m: "Link shortener — the real destination is hidden. Expand it before joining." }); }

    const trusted = Argus.TRUSTED_MEET_DOMAINS.find(t => host === t || host.endsWith("." + t));
    if (trusted) {
      reasons.push({ t: "good", m: `${trusted} is a recognized interview/meeting platform.` });
      if (danger === 0) {
        return {
          level: caution ? "CAUTION" : "SAFE",
          headline: caution ? "Recognized platform, but check the details flagged below" : "This is a recognized interview platform",
          reasons: [...reasons, { t: "info", m: "Still verify the inviter's email domain matches the company, and never install software or pay fees to join an interview." }],
        };
      }
    } else {
      const brands = ["zoom", "meet", "teams", "webex", "skype", "google", "microsoft", "linkedin", "naukri"];
      const brandHit = brands.find(b => host.includes(b));
      if (brandHit) { danger++; reasons.push({ t: "bad", m: `Contains “${brandHit}” but is NOT the official ${brandHit} domain — brand impersonation pattern.` }); }
      const parts = host.split(".");
      const reg = parts.slice(-2).join(".");
      for (const t of Argus.TRUSTED_MEET_DOMAINS) {
        const treg = t.split(".").slice(-2).join(".");
        const d = levenshtein(reg, treg);
        if (d > 0 && d <= 2) { danger++; reasons.push({ t: "bad", m: `“${reg}” is a near-miss of “${treg}” (typosquat).` }); break; }
      }
      if (!danger) reasons.push({ t: "warn", m: `${host} is not a known interview platform. It may be a company's own portal — verify it matches their official website domain exactly.` });
    }

    if (danger) return { level: "DANGER", headline: "Do NOT join this link", reasons: [...reasons, { t: "info", m: "Break contact and re-verify through the company's official careers page or switchboard. Report at cybercrime.gov.in if money or documents were requested." }] };
    if (caution || !trusted) return { level: "CAUTION", headline: "Proceed carefully — could not fully verify", reasons };
    return { level: "SAFE", headline: "No local red flags detected", reasons };
  }

  const PANIC_CFG = {
    SAFE:    { color: "#4d6a38", icon: "✅", chip: "good" },
    CAUTION: { color: "#b3892e", icon: "⚠️", chip: "warn" },
    DANGER:  { color: "#a03c2c", icon: "🚨", chip: "crit" },
  };

  function openPanic() {
    openModal(`
      <h3>🚨 Interview Panic Button</h3>
      <div class="m-sub">About to join an interview call, open a document, or click a link — and something feels off? Paste it. Argonaut checks the channel instantly, on-device.</div>
      <input class="input-text" id="panic-input" placeholder="e.g. zoom-meeting-hr.live/join/8842 or hr@company-careers.top"/>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button class="btn-primary btn-sm" id="panic-check" style="flex:1">⚡ Instant check</button>
        <button class="btn-ghost btn-sm" id="panic-deep" style="flex:1" title="Uses one AI scan">🔬 AI deep check</button>
      </div>
      <div id="panic-result"></div>
    `);
    const $ = id => document.getElementById(id);
    const renderVerdict = (v, extraSources) => {
      if (!v) return;
      const cfg = PANIC_CFG[v.level] || PANIC_CFG.CAUTION;
      $("panic-result").innerHTML = `
        <div class="glass-flat" style="margin-top:16px;padding:16px;border-radius:13px;border-color:${cfg.color}44">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:22px">${cfg.icon}</span>
            <div>
              <span class="chip ${cfg.chip}">${v.level}</span>
              <div style="font-weight:700;font-size:14.5px;margin-top:4px">${esc(v.headline)}</div>
            </div>
          </div>
          ${(v.reasons || []).map(r => {
            const icon = r.t === "bad" ? "✕" : r.t === "warn" ? "!" : r.t === "good" ? "✓" : "·";
            const col = r.t === "bad" ? "var(--crit)" : r.t === "warn" ? "var(--warn)" : r.t === "good" ? "var(--good)" : "var(--ink-3)";
            return `<div style="display:flex;gap:9px;font-size:13px;color:var(--ink-2);padding:4px 0;line-height:1.55"><b style="color:${col};flex-shrink:0">${icon}</b>${esc(r.m || r)}</div>`;
          }).join("")}
          ${v.advice ? `<div style="font-size:13px;color:var(--ink-2);margin-top:8px;line-height:1.6">💡 ${esc(v.advice)}</div>` : ""}
          ${(extraSources || []).length ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--neutral-border)">${extraSources.map(s => `<a href="${esc(s.uri)}" target="_blank" rel="noopener" style="display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">↗ ${esc(s.title)}</a>`).join("")}</div>` : ""}
        </div>`;
    };
    $("panic-check").addEventListener("click", () => {
      const v = checkLink($("panic-input").value);
      if (!v) { toast("Paste a link or domain first"); return; }
      renderVerdict(v);
    });
    $("panic-deep").addEventListener("click", async () => {
      const input = $("panic-input").value.trim();
      if (!input) { toast("Paste a link or domain first"); return; }
      if (!S.hasConsent()) { closeModal(); openConsent(); return; }
      if (S.quotaLeft() <= 0) { toast("Daily AI quota reached — instant check still works"); return; }
      $("panic-result").innerHTML = `<div style="margin-top:16px;display:flex;gap:10px;align-items:center;color:var(--ink-2);font-size:13px"><span class="spinner"></span> Argus is investigating the domain…</div>`;
      try {
        const { parsed, sources } = await Argus.engine.deepCheckLink(input);
        S.recordUsage();
        renderVerdict({ level: parsed.level, headline: parsed.headline, reasons: (parsed.reasons || []).map(m => ({ t: "warn", m })), advice: parsed.advice }, sources);
      } catch (err) {
        const pmsg = /api[ _]key (not valid|invalid|expired)|api_key_invalid/i.test(String(err.message))
          ? "Your engine access key was rejected — open Settings (⚙) and paste a fresh key from Google AI Studio."
          : err.message;
        $("panic-result").innerHTML = `<div style="margin-top:16px;font-size:13px;color:var(--crit-strong)">⚠ ${esc(pmsg)}</div>`;
      }
    });
    setTimeout(() => $("panic-input").focus(), 60);
  }

  /* ═══ AMBIENT CANVAS — the Argonaut voyage ═════════════
     Three layers on one canvas, museum-calm:
     1. Geometric waves + a line-art trireme that gently
        floats and bobs — a living exhibit watermark.
     2. Argus nodes: concentric bronze rings (never literal
        eyes) pulsing and linked by hairline filaments,
        overlapping the boat.
     3. A slow golden scan-band that sweeps the marble every
        ~16s and briefly wakes the nodes it crosses. */
  function initParticles() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.getElementById("fx");
    const ctx = canvas.getContext("2d");
    let W, H, nodes = [], boat = null;

    const NODE_A = "140,95,42";     // brushed bronze
    const NODE_B = "178,104,60";    // terracotta
    const NODE_C = "166,134,62";    // muted gold
    const BOAT_C = "140,95,42";     // boat line-art bronze
    const LINK_D = 170;             // filament reach
    const SWEEP_PERIOD = 16;        // seconds per wall scan

    function build() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      // Zero-sized viewport (prerender/hidden frame) — retry until laid out
      if (!W || !H) { requestAnimationFrame(build); return; }
      const N = Math.min(44, Math.max(18, Math.floor(W / 34)));
      nodes = [];
      for (let i = 0; i < N; i++) {
        const roll = Math.random();
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .12,
          ring: 5 + Math.random() * 9,               // outer iris radius
          phase: Math.random() * Math.PI * 2,        // blink offset
          speed: .4 + Math.random() * .7,            // blink tempo
          c: roll < .55 ? NODE_A : roll < .82 ? NODE_B : NODE_C,
        });
      }
      // Boat anchor: right of center, upper-middle of the wall.
      // Scale tracks viewport so it stays a watermark, not a mural.
      boat = {
        cx: W * (W < 860 ? .5 : .72),
        cy: H * .34,
        s: Math.min(340, Math.max(180, W * .24)) / 300,   // unit design is 300×200
      };
    }
    build();
    window.addEventListener("resize", build);

    /* ── The trireme, drawn in unit space 300×200 ──────── */
    function drawBoat(t) {
      const bob    = Math.sin(t * .55) * 6;          // vertical float
      const heel   = Math.sin(t * .42 + 1.2) * .028; // gentle roll (rad)
      const alpha  = .30;
      ctx.save();
      ctx.translate(boat.cx, boat.cy + bob);
      ctx.rotate(heel);
      ctx.scale(boat.s, boat.s);
      ctx.translate(-150, -100);                     // unit-space origin
      ctx.strokeStyle = `rgba(${BOAT_C},${alpha})`;
      ctx.lineWidth = 1.6 / boat.s;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const P = new Path2D();
      // hull — keel and deck sheer lines
      P.moveTo(25, 135); P.bezierCurveTo(90, 162, 210, 162, 275, 120);
      P.moveTo(40, 127); P.bezierCurveTo(110, 148, 200, 146, 263, 116);
      // stern volute (spiral)
      P.moveTo(275, 120); P.bezierCurveTo(290, 108, 289, 92, 274, 87);
      P.bezierCurveTo(284, 96, 283, 110, 272, 118);
      // bow ram
      P.moveTo(25, 135); P.lineTo(7, 127);
      // mast + yard
      P.moveTo(150, 148); P.lineTo(150, 54);
      P.moveTo(98, 60);  P.lineTo(202, 60);
      // pennant at masthead
      P.moveTo(150, 54); P.lineTo(150, 44); P.lineTo(172, 50); P.lineTo(150, 56);
      ctx.stroke(P);

      // sail — billows in the same rhythm as the bob
      const billow = 100 + Math.sin(t * .55 + .6) * 7;
      const sail = new Path2D();
      sail.moveTo(100, 62);
      sail.quadraticCurveTo(150, billow, 200, 62);
      ctx.stroke(sail);

      // oars — six, sweeping subtly out of phase
      for (let i = 0; i < 6; i++) {
        const ox = 72 + i * 29.6;
        const oy = 141 + Math.sin((ox / 300) * Math.PI) * 8;
        const sweep = Math.sin(t * .55 + i * .7) * 4;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox - 13 + sweep, oy + 28);
        ctx.stroke();
      }
      ctx.restore();

      /* geometric waves — three drifting sine polylines under the hull */
      const waveY = boat.cy + 78 * boat.s;
      for (let w = 0; w < 3; w++) {
        const yw = waveY + w * 14 * boat.s;
        const amp = (5 - w) * boat.s;
        const speed = .5 + w * .18;
        const span = 190 * boat.s * (1 - w * .18);
        ctx.beginPath();
        for (let x = -span; x <= span; x += 8) {
          const y = yw + Math.sin(x * .045 / boat.s + t * speed) * amp;
          x === -span ? ctx.moveTo(boat.cx + x, y) : ctx.lineTo(boat.cx + x, y);
        }
        ctx.strokeStyle = `rgba(${BOAT_C},${(.2 - w * .05).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    function frame(now) {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);

      /* 1 — the voyage (behind the network) */
      drawBoat(t);

      // scan-band position (sweeps left→right, then restarts)
      const sweepX = ((t % SWEEP_PERIOD) / SWEEP_PERIOD) * (W + 480) - 240;

      // faint golden band — light passing across the marble
      const band = ctx.createLinearGradient(sweepX - 160, 0, sweepX + 160, 0);
      band.addColorStop(0, "rgba(201,162,75,0)");
      band.addColorStop(.5, "rgba(201,162,75,0.045)");
      band.addColorStop(1, "rgba(201,162,75,0)");
      ctx.fillStyle = band;
      ctx.fillRect(sweepX - 160, 0, 320, H);

      /* 2 — filaments between nearby nodes */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_D * LINK_D) {
            const a = (1 - Math.sqrt(d2) / LINK_D) * .06;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${NODE_A},${a.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      /* 3 — Argus nodes: concentric rings + core, pulsing */
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;

        const pulse = .5 + .5 * Math.sin(t * n.speed + n.phase);
        const dxs = (n.x - sweepX) / 150;
        const wake = Math.exp(-dxs * dxs);          // scan-band excitation
        const alpha = .07 + .10 * pulse + .22 * wake;
        const r1 = n.ring * (.85 + .22 * pulse + .18 * wake);

        ctx.lineWidth = 1;
        ctx.beginPath();                             // outer iris
        ctx.arc(n.x, n.y, r1, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${n.c},${(alpha * .85).toFixed(3)})`;
        ctx.stroke();
        ctx.beginPath();                             // inner iris
        ctx.arc(n.x, n.y, r1 * .52, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${n.c},${(alpha * .5).toFixed(3)})`;
        ctx.stroke();
        ctx.beginPath();                             // pupil node
        ctx.arc(n.x, n.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.c},${Math.min(.5, alpha + .14).toFixed(3)})`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ═══ LOGO MERGE — the eyes gather into one ════════════
     On load, small bronze "eye" dots scatter around the
     shield, then glide into the central node and fuse with
     a soft pulse. Runs once per page load. */
  function logoMergeAnimation() {
    const svg = document.querySelector("#nav-logo svg");
    if (!svg || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const NS = "http://www.w3.org/2000/svg";
    const CX = 16, CY = 15, N = 7, DUR = 1150, STAGGER = 70;
    const core = svg.querySelector("circle[r='.9'], circle[r='0.9']");
    const dots = [];
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + Math.random() * .5;
      const dist = 15 + Math.random() * 12;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "1.15");
      c.setAttribute("fill", "rgba(140,95,42,.9)");
      c.setAttribute("cx", (CX + Math.cos(ang) * dist).toFixed(2));
      c.setAttribute("cy", (CY + Math.sin(ang) * dist).toFixed(2));
      svg.appendChild(c);
      dots.push({ el: c, x0: CX + Math.cos(ang) * dist, y0: CY + Math.sin(ang) * dist, delay: i * STAGGER });
    }
    const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const t0 = performance.now();
    function step(now) {
      let live = false;
      for (const d of dots) {
        const p = Math.min(1, Math.max(0, (now - t0 - d.delay) / DUR));
        if (p < 1) live = true;
        const e = easeInOut(p);
        d.el.setAttribute("cx", (d.x0 + (CX - d.x0) * e).toFixed(2));
        d.el.setAttribute("cy", (d.y0 + (CY - d.y0) * e).toFixed(2));
        d.el.setAttribute("opacity", String(1 - e * .55));
        if (p === 1) d.el.remove();
      }
      if (live) requestAnimationFrame(step);
      else if (core) {
        // fuse: the central node swells once, then settles
        const p0 = performance.now();
        (function pulseStep(n2) {
          const q = Math.min(1, (n2 - p0) / 620);
          core.setAttribute("r", (0.9 + Math.sin(q * Math.PI) * 1.6).toFixed(2));
          if (q < 1) requestAnimationFrame(pulseStep);
          else core.setAttribute("r", "0.9");
        })(p0);
      }
    }
    requestAnimationFrame(step);
  }

  /* ═══ BOOT ═════════════════════════════════════════════ */
  function init() {
    document.querySelectorAll(".nav-link").forEach(el =>
      el.addEventListener("click", () => go(el.dataset.route)));
    document.getElementById("nav-logo").addEventListener("click", () => go("home"));
    document.getElementById("nav-panic").addEventListener("click", openPanic);
    document.getElementById("nav-settings").addEventListener("click", () => openSettings(false));
    initParticles();
    logoMergeAnimation();
    renderRoute();
    if (S.getConsent() === null) setTimeout(openConsent, 900);
  }

  Argus.app = { go, route, toast, copyText, openConsent, openSettings, openPanic, closeModal };
  // Scripts are injected by the boot loader with async=false, so they may
  // execute after DOMContentLoaded has already fired — guard both paths.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
