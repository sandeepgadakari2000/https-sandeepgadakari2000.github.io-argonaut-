/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Argus Engine (on-device orchestration layer)
   ───────────────────────────────────────────────────────────
   Thin wrapper over Argus.model. Every verdict is computed
   locally in this browser — there is no API, no key, and no
   network request. The old provider-client surface (analyzePost,
   deepCheckLink, hasKey, validateKey) is preserved so the
   scanner, batch pipeline, and panic button keep working
   unchanged; only the implementation moved on-device.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.engine = (function () {

  /* A short, deterministic "thinking" delay so the scanner's
     three-phase choreography still reads as deliberate analysis
     rather than an instant flash. Purely cosmetic. */
  const THINK_MS = 1300;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ── Full job-post analysis ─────────────────────────────
     Text → local ensemble verdict. Screenshots have no OCR
     on-device, so an image-only scan returns an honest,
     actionable INCONCLUSIVE result (the perceptual-hash
     duplicate check upstream still catches known scam images). */
  async function analyzePost({ text, imageB64, imgType, fast }) {
    const t0 = performance.now();
    const think = fast ? 0 : THINK_MS;   // batch pipeline skips the cosmetic delay

    if (!text && imageB64) {
      if (think) await wait(think);
      return {
        parsed: imageOnlyResult(),
        sources: [],
        latencyMs: Math.round(performance.now() - t0),
      };
    }

    if (think) await wait(think);
    const parsed = Argus.model.analyze(text || "");
    return { parsed, sources: [], latencyMs: Math.round(performance.now() - t0) };
  }

  function imageOnlyResult() {
    return {
      trust_score: 50,
      verdict: "SUSPICIOUS",
      verdict_type: "SUSPICIOUS",
      confidence: "LOW",
      summary: "This screenshot didn't match any known scam image in the on-device library. Argus reads text signals for a full verdict — paste the post's text (or the caption) to run the complete fraud analysis.",
      extracted: { company: null, role: null, location: null, salary: null, contact_method: null, poster: null, identifiers: { phones: [], upi: [], emails: [] } },
      verification: { status: "INCONCLUSIVE", careers_url: null, detail: "On-device image intelligence checks screenshots against known scam graphics via perceptual hashing; deeper text analysis needs the post's words." },
      red_flags: [],
      green_flags: [],
      recommendation: "Copy the text out of the screenshot and paste it into the Scanner for a full trust score and red-flag breakdown.",
      report_note: "If this screenshot is a known scam that wasn't caught, report it to grow the community image library.",
    };
  }

  /* ── Interview link / domain deep check (panic button) ──
     Delegates to the app's local heuristic analyser. No network. */
  async function deepCheckLink(url) {
    await wait(700);
    const v = (Argus.app && Argus.app.analyzeLink)
      ? Argus.app.analyzeLink(url)
      : { level: "CAUTION", headline: "Could not analyse that input", reasons: [] };
    return { parsed: { level: v.level, headline: v.headline, reasons: (v.reasons || []).map(r => r.m || r), advice: v.advice }, sources: [] };
  }

  /* ── Compatibility shims ────────────────────────────────
     The on-device engine needs no key. These keep older call
     sites (settings save, consent flow) working without change. */
  function hasKey() { return true; }
  async function validateKey() { return { ok: true, reason: "on-device" }; }

  return { analyzePost, deepCheckLink, hasKey, validateKey, VERSION: () => Argus.model.VERSION };
})();
