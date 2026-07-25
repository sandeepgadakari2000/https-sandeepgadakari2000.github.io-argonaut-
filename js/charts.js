/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Chart Components (SVG, dependency-free)
   Museum palette: earth-toned verdict dial, bronze trend line,
   sepia sequential ramp on marble vitrines.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.charts = (function () {

  /* ── Shared tooltip ─────────────────────────────────── */
  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "chart-tip";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(x, y, html) {
    const t = tip();
    t.innerHTML = html;
    t.style.left = Math.min(x + 14, window.innerWidth - 180) + "px";
    t.style.top = (y - 14) + "px";
    t.style.opacity = "1";
  }
  function hideTip() { if (tipEl) tipEl.style.opacity = "0"; }

  /* ── Trust score gauge — circular ring ──────────────────
     A full-ring radial gauge: the ring fills clockwise from the top
     to the score, and its colour signals trust (terracotta = scam,
     sage = legit). Symmetric and clip-proof at every score. */
  function gauge(score) {
    const s = Argus.scoreStyle(score);
    const pct = Math.min(100, Math.max(0, score));
    const cx = 68, cy = 68, r = 54, sw = 11;
    const C = 2 * Math.PI * r;
    const offset = (C * (1 - pct / 100)).toFixed(2);
    return `
    <svg width="136" height="136" viewBox="0 0 136 136" style="flex-shrink:0" role="img" aria-label="Trust score ${score} out of 100">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(140,106,63,0.15)" stroke-width="${sw}"/>
      ${pct > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})"/>` : ""}
      <text x="${cx}" y="${cy + 1}" text-anchor="middle" fill="${s.color}" font-size="36"
        font-family="'JetBrains Mono',monospace" font-weight="700">${score}</text>
      <text x="${cx}" y="${cy + 20}" text-anchor="middle" fill="rgba(110,92,72,0.62)" font-size="8"
        font-family="Inter,sans-serif" letter-spacing="2">TRUST SCORE</text>
    </svg>`;
  }

  /* ── Sparkline / area chart with crosshair tooltip ──── */
  function sparkline(container, points, opts = {}) {
    const W = opts.width || container.clientWidth || 520, H = opts.height || 150;
    const padL = 8, padR = 46, padT = 14, padB = 22;
    const vals = points.map(p => p.value);
    const vMin = Math.min(...vals), vMax = Math.max(...vals);
    const span = (vMax - vMin) || 1;
    const px = i => padL + (i / (points.length - 1)) * (W - padL - padR);
    const py = v => padT + (1 - (v - vMin) / span) * (H - padT - padB);

    let line = "";
    points.forEach((p, i) => {
      line += `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(p.value).toFixed(1)} `;
    });
    const area = line + `L${px(points.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`;
    const last = points[points.length - 1];

    container.innerHTML = `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;overflow:visible">
      <defs>
        <linearGradient id="ag-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(154,107,49,0.22)"/>
          <stop offset="100%" stop-color="rgba(154,107,49,0)"/>
        </linearGradient>
      </defs>
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(140,106,63,0.25)" stroke-width="1"/>
      <path d="${area}" fill="url(#ag-area)"/>
      <path d="${line}" fill="none" stroke="#8c5f2a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${px(points.length - 1)}" cy="${py(last.value)}" r="4" fill="#8c5f2a" stroke="#fbf9f5" stroke-width="2"/>
      <text x="${px(points.length - 1) + 9}" y="${py(last.value) + 4}" fill="#6d5c48" font-size="12"
        font-family="'JetBrains Mono',monospace" font-weight="700">${last.value}</text>
      <text x="${padL}" y="${H - 6}" fill="rgba(110,92,72,0.6)" font-size="10" font-family="Inter,sans-serif">${points[0].label}</text>
      <text x="${W - padR}" y="${H - 6}" text-anchor="end" fill="rgba(110,92,72,0.6)" font-size="10" font-family="Inter,sans-serif">${last.label}</text>
      <line class="ag-cross" x1="0" y1="${padT}" x2="0" y2="${H - padB}" stroke="rgba(110,92,72,0.55)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>
      <circle class="ag-dot" r="4" fill="#fbf9f5" stroke="#8c5f2a" stroke-width="2" opacity="0"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    </svg>`;

    const svg = container.querySelector("svg");
    const cross = svg.querySelector(".ag-cross");
    const dot = svg.querySelector(".ag-dot");
    svg.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width * W;
      let idx = Math.round((relX - padL) / (W - padL - padR) * (points.length - 1));
      idx = Math.max(0, Math.min(points.length - 1, idx));
      const p = points[idx];
      cross.setAttribute("x1", px(idx)); cross.setAttribute("x2", px(idx));
      cross.setAttribute("opacity", "1");
      dot.setAttribute("cx", px(idx)); dot.setAttribute("cy", py(p.value));
      dot.setAttribute("opacity", "1");
      showTip(e.clientX, e.clientY,
        `<div class="tip-label">${p.label}</div><b>${p.value}</b> scans`);
    });
    svg.addEventListener("mouseleave", () => {
      cross.setAttribute("opacity", "0"); dot.setAttribute("opacity", "0"); hideTip();
    });
  }

  /* ── Horizontal bars — sequential ramp (magnitude) ──── */
  const RAMP = ["#c9a878", "#b8935c", "#a68144", "#93702f", "#7f5e28", "#6a4d22"];
  function rampColor(frac) {
    return RAMP[Math.min(RAMP.length - 1, Math.floor(frac * RAMP.length))];
  }
  function hbars(container, rows, opts = {}) {
    const max = Math.max(...rows.map(r => r.value), 1);
    container.innerHTML = rows.map(r => {
      const frac = r.value / max;
      const color = r.color || rampColor(frac);
      return `
      <div class="hbar-row" data-label="${r.label}" data-value="${r.value}" data-detail="${r.detail || ""}">
        <div class="hb-label">${r.icon ? r.icon + " " : ""}${r.label}</div>
        <div class="hb-track"><div class="hb-fill" style="width:${(frac * 100).toFixed(1)}%;background:${color}"></div></div>
        <div class="hb-val">${r.value.toLocaleString("en-IN")}</div>
      </div>`;
    }).join("");
    container.querySelectorAll(".hbar-row").forEach(row => {
      row.addEventListener("mousemove", (e) => {
        const d = row.dataset;
        showTip(e.clientX, e.clientY,
          `<div class="tip-label">${d.label}</div><b>${Number(d.value).toLocaleString("en-IN")}</b> ${d.detail || opts.unit || ""}`);
      });
      row.addEventListener("mouseleave", hideTip);
    });
  }

  return { gauge, sparkline, hbars, rampColor, showTip, hideTip };
})();
