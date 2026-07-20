/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Local Intelligence Store
   Pillar 2: Persistent, relational company trust scores
   Pillar 5: Geospatial & macro scam trend telemetry
   + Scam library, applicant vault, audit trails (DPDP),
     usage quota (graceful throttling — blueprint §3.1)
   All data stays on-device. BigInt hashes stored as strings.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.store = (function () {
  const K = {
    settings:  "argus_settings",
    consent:   "argus_consent",
    scans:     "argus_scans",
    companies: "argus_companies",
    scamlib:   "argus_scamlib",
    vault:     "argus_vault",
    audit:     "argus_audit",
    usage:     "argus_usage",
    telemetry: "argus_telemetry",
    learn:     "argus_learn",
  };

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota */ }
  }

  /* ── Settings / consent ─────────────────────────────── */
  const getSettings = () => get(K.settings, { apiKey: "" });
  const setSettings = (s) => set(K.settings, s);
  const getConsent  = () => get(K.consent, null);
  const setConsent  = (c) => set(K.consent, c);
  const hasConsent  = () => {
    const c = getConsent();
    return !!(c && c.accepted && c.version === Argus.CONFIG.CONSENT_VERSION);
  };

  /* ── Usage quota (graceful throttling) ──────────────── */
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function usageToday() {
    const u = get(K.usage, {});
    return u[todayKey()] || 0;
  }
  /* Fixed free-tier ceiling — per-user, not user-adjustable */
  function quotaLeft() {
    return Math.max(0, Argus.CONFIG.DAILY_QUOTA - usageToday());
  }
  function recordUsage() {
    const u = get(K.usage, {});
    u[todayKey()] = (u[todayKey()] || 0) + 1;
    // keep only last 30 days
    const keys = Object.keys(u).sort();
    while (keys.length > 30) delete u[keys.shift()];
    set(K.usage, u);
  }

  /* ── Scans (fingerprint DB) ─────────────────────────── */
  const getScans = () => get(K.scans, []);
  function saveScan(scan) {
    const scans = getScans();
    scan.id = "sc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    scan.ts = Date.now();
    scans.unshift(scan);
    if (scans.length > 400) scans.length = 400;
    set(K.scans, scans);
    return scan;
  }
  /* Duplicate lookup: exact hash → near simhash → image dHash */
  function findDuplicate({ exact, sim, imgHash }) {
    const scans = getScans();
    if (exact) {
      const hit = scans.find(s => s.exact === exact);
      if (hit) return { kind: "exact", scan: hit, distance: 0,
        seenCount: scans.filter(s => s.exact === exact).length };
    }
    if (sim) {
      const simB = BigInt("0x" + sim);
      let best = null, bestD = 999;
      for (const s of scans) {
        if (!s.sim) continue;
        const d = Argus.fp.hamming(simB, BigInt("0x" + s.sim));
        if (d < bestD) { bestD = d; best = s; }
      }
      if (best && bestD <= Argus.CONFIG.SIMHASH_THRESHOLD)
        return { kind: "near", scan: best, distance: bestD, seenCount: 1 };
    }
    if (imgHash) {
      const imgB = BigInt("0x" + imgHash);
      let best = null, bestD = 999;
      for (const s of scans) {
        if (!s.imgHash) continue;
        const d = Argus.fp.hamming(imgB, BigInt("0x" + s.imgHash));
        if (d < bestD) { bestD = d; best = s; }
      }
      if (best && bestD <= Argus.CONFIG.IMGHASH_THRESHOLD)
        return { kind: "image", scan: best, distance: bestD, seenCount: 1 };
    }
    return null;
  }

  /* ── Company trust ledger ───────────────────────────── */
  function normCompany(name) { return (name || "").trim().toLowerCase(); }
  function isVerified(name) {
    const n = normCompany(name);
    if (!n) return false;
    return Argus.SEED_VERIFIED.some(v => v.toLowerCase() === n);
  }
  function upsertCompany(name, score, verdictType) {
    if (!name || name === "null") return;
    const list = get(K.companies, []);
    const n = normCompany(name);
    let rec = list.find(c => normCompany(c.name) === n);
    if (!rec) {
      rec = { name: name.trim(), scans: 0, totalScore: 0, flags: 0, firstSeen: Date.now() };
      list.push(rec);
    }
    rec.scans += 1;
    rec.totalScore += score;
    if (verdictType === "ACTUAL_SCAM" || verdictType === "SUSPICIOUS") rec.flags += 1;
    rec.lastSeen = Date.now();
    set(K.companies, list);
  }
  /* Ledger = real local scan records + badge-only registry rows.
     Registry rows carry no metrics — numbers come only from
     analyses actually performed on this device. */
  function companyLedger() {
    const local = get(K.companies, []).map(c => ({
      name: c.name, scans: c.scans,
      avgScore: Math.round(c.totalScore / Math.max(1, c.scans)),
      flags: c.flags, verified: isVerified(c.name), local: true,
    }));
    const registry = Argus.SEED_REGISTRY
      .filter(name => !local.some(l => normCompany(l.name) === normCompany(name)))
      .map(name => ({ name, scans: 0, avgScore: null, flags: 0, verified: true, local: false }));
    return [...local.sort((a, b) => b.scans - a.scans), ...registry];
  }
  function companyRecord(name) {
    return companyLedger().find(c => normCompany(c.name) === normCompany(name)) || null;
  }

  /* ── Community scam library ─────────────────────────── */
  function scamLibrary() {
    const local = get(K.scamlib, []);
    return [...local, ...Argus.SEED_SCAMLIB];
  }
  function addScamReport({ type, value, note }) {
    const local = get(K.scamlib, []);
    const existing = local.find(e => e.value.toLowerCase() === value.toLowerCase());
    if (existing) { existing.reports += 1; existing.note = note || existing.note; }
    else local.unshift({ type, value, note, reports: 1, seeded: false, ts: Date.now() });
    set(K.scamlib, local);
  }
  /* Cross-check a post's text + extracted identifiers */
  function checkScamLibrary(text, extractedIds) {
    const lib = scamLibrary();
    const hits = [];
    const hay = (text || "").toLowerCase();
    const ids = extractedIds || { phones: [], upi: [], emails: [] };
    for (const entry of lib) {
      const v = entry.value.toLowerCase().replace(/\s/g, "");
      if (v.includes("x")) continue; // masked seed numbers can't literal-match
      const inText = hay.replace(/\s/g, "").includes(v);
      const inIds =
        ids.phones.some(p => p.toLowerCase().includes(v) || v.includes(p.toLowerCase())) ||
        ids.upi.some(u => u.toLowerCase() === v) ||
        ids.emails.some(e => e.toLowerCase().includes(v));
      if (inText || inIds) hits.push(entry);
    }
    return hits;
  }

  /* ── Applicant vault ────────────────────────────────── */
  const getVault = () => get(K.vault, []);
  function addVaultEntry(entry) {
    const v = getVault();
    entry.id = "v_" + Date.now().toString(36);
    entry.ts = Date.now();
    v.unshift(entry);
    set(K.vault, v);
  }
  function removeVaultEntry(id) {
    set(K.vault, getVault().filter(e => e.id !== id));
  }

  /* ── Audit trail (intermediary protection, §4) ──────── */
  function audit(scanId, step, detail) {
    const log = get(K.audit, []);
    log.unshift({ ts: Date.now(), scanId, step, detail });
    if (log.length > 600) log.length = 600;
    set(K.audit, log);
  }
  const auditLog = (scanId) => {
    const log = get(K.audit, []);
    return scanId ? log.filter(e => e.scanId === scanId) : log;
  };

  /* ── Telemetry (region counts + daily series) ───────── */
  function recordTelemetry(locationText) {
    const t = get(K.telemetry, { cities: {}, days: {} });
    const loc = (locationText || "").toLowerCase();
    for (const city of Argus.CITY_PATTERNS) {
      if (loc.includes(city)) {
        const label = city === "bangalore" ? "bengaluru" : city;
        t.cities[label] = (t.cities[label] || 0) + 1;
        break;
      }
    }
    t.days[todayKey()] = (t.days[todayKey()] || 0) + 1;
    set(K.telemetry, t);
  }
  /* Real region tallies from this device's scans only */
  function hotspots() {
    const t = get(K.telemetry, { cities: {}, days: {} });
    return Object.entries(t.cities)
      .map(([city, n]) => ({ city: city[0].toUpperCase() + city.slice(1), count: n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
  /* 14-day scan series — real daily counts, no synthetic baseline */
  function trendSeries() {
    const t = get(K.telemetry, { cities: {}, days: {} });
    const out = [];
    let total = 0;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const value = t.days[key] || 0;
      total += value;
      out.push({
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        value,
      });
    }
    out.total = total;
    return out;
  }

  /* ── Aggregate stats — this device only, no demo data ─ */
  function stats() {
    const scans = getScans();
    const fakes = scans.filter(s => s.result && s.result.trust_score <= 45).length;
    return {
      scanned: scans.length,
      fakes,
      localScans: scans.length,
      companies: companyLedger().length,
      libraryEntries: scamLibrary().length,
      quotaLeft: quotaLeft(),
    };
  }

  /* ── Verdict distribution — real local scans only ───── */
  function verdictDist() {
    const scans = getScans();
    const dist = { LEGITIMATE: 0, ENGAGEMENT_BAIT: 0, SUSPICIOUS: 0, ACTUAL_SCAM: 0 };
    for (const s of scans) {
      const vt = s.result && s.result.verdict_type;
      if (vt && dist[vt] !== undefined) dist[vt] += 1;
    }
    return dist;
  }

  /* ── DPDP data rights ───────────────────────────────── */
  function exportAll() {
    const dump = {};
    for (const key of Object.values(K)) dump[key] = get(key, null);
    return JSON.stringify(dump, null, 2);
  }
  function eraseAll() {
    for (const key of Object.values(K)) localStorage.removeItem(key);
  }

  /* ── Learn progress ─────────────────────────────────── */
  const getLearn = () => get(K.learn, { done: [], quizBest: null });
  const setLearn = (l) => set(K.learn, l);

  return {
    getSettings, setSettings, getConsent, setConsent, hasConsent,
    usageToday, quotaLeft, recordUsage,
    getScans, saveScan, findDuplicate,
    upsertCompany, companyLedger, companyRecord, isVerified,
    scamLibrary, addScamReport, checkScamLibrary,
    getVault, addVaultEntry, removeVaultEntry,
    audit, auditLog,
    recordTelemetry, hotspots, trendSeries, stats, verdictDist,
    exportAll, eraseAll, getLearn, setLearn,
  };
})();
