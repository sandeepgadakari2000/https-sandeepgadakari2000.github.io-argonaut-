/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Argus AI Engine Client
   Search-grounded LLM analysis for live careers-page
   verification. Provider details are confined to this module.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.engine = (function () {

  function apiKey() {
    return (Argus.store.getSettings().apiKey || "").trim();
  }

  /* ── Model discovery ──────────────────────────────────
     Google retires model ids for newly created keys, so the
     engine walks CONFIG.MODEL_CANDIDATES and remembers the
     first id this key can actually use. The remembered id is
     tried first on later calls; if Google retires it too, the
     walk simply happens again. */
  function modelCandidates() {
    const list = Argus.CONFIG.MODEL_CANDIDATES.slice();
    const saved = (Argus.store.getSettings().engineModel || "").trim();
    if (saved) {
      const i = list.indexOf(saved);
      if (i >= 0) list.splice(i, 1);
      list.unshift(saved);
    }
    return list;
  }
  function rememberModel(model) {
    try {
      const st = Argus.store.getSettings();
      if (st.engineModel !== model) { st.engineModel = model; Argus.store.setSettings(st); }
    } catch (e) { /* persistence is best-effort */ }
  }
  function isModelUnavailable(status, msg) {
    if (status === 404) return true;
    return /no longer available|not available to|has been deprecated|is not found|not found for API|not supported for|unknown model/i
      .test(msg || "");
  }

  function extractJSON(raw) {
    const stripped = (raw || "").replace(/```json\s*|\s*```/g, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Could not find JSON in the engine response");
    return JSON.parse(stripped.slice(start, end + 1));
  }

  async function call({ systemPrompt, parts, useSearch = true, maxTokens = 8192 }) {
    const key = apiKey();
    if (!key) {
      const e = new Error("No engine access key configured. Open Settings (⚙) and add your key to enable AI analysis.");
      e.code = "NO_KEY";
      throw e;
    }
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    };

    const t0 = performance.now();
    let res = null, data = null, lastMsg = "";
    const candidates = modelCandidates();
    walk:
    for (let i = 0; i < candidates.length; i++) {
      /* Try with live-search grounding first; if the tool itself is
         refused on this model/tier, retry the same model bare — the
         system prompt downgrades verification to INCONCLUSIVE. */
      const modes = useSearch ? [true, false] : [false];
      for (const withTools of modes) {
        const attempt = Object.assign({}, body);
        if (withTools) attempt.tools = [{ google_search: {} }];
        res = await fetch(Argus.CONFIG.ENDPOINT_FOR(candidates[i]), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(attempt),
        });
        data = await res.json().catch(() => ({}));
        if (res.ok) { rememberModel(candidates[i]); break walk; }
        lastMsg = (data.error && data.error.message) || `HTTP ${res.status}`;
        if (withTools && res.status !== 429 && /tool|grounding|search/i.test(lastMsg)) continue;
        if (isModelUnavailable(res.status, lastMsg)) continue walk;  // retired → next model
        if (res.status === 429) continue walk;                       // out of quota → next model
        throw new Error(lastMsg);                                    // real error — surface it
      }
    }
    if (!res || !res.ok) {
      const quota = /quota|rate.?limit|resource_exhausted|429/i.test(lastMsg);
      const e = new Error(quota
        ? "The engine's free-tier quota is used up right now (rate limit across all available models). Wait a minute and retry — daily free quotas also reset overnight. If it persists, review plan & billing for your key at ai.google.dev/rate-limits"
        : (lastMsg || "The engine could not be reached."));
      if (quota) e.code = "QUOTA";
      throw e;
    }
    const latencyMs = Math.round(performance.now() - t0);

    const cand = (data.candidates || [])[0] || {};
    const rawText = ((cand.content || {}).parts || [])
      .filter(p => typeof p.text === "string")
      .map(p => p.text)
      .join("");

    // Grounding sources (careers pages found via live web search)
    let sources = [];
    const gm = cand.groundingMetadata;
    if (gm && Array.isArray(gm.groundingChunks)) {
      sources = gm.groundingChunks
        .filter(c => c.web && c.web.uri)
        .map(c => ({ uri: c.web.uri, title: c.web.title || c.web.uri }))
        .slice(0, 4);
    }
    return { rawText, sources, latencyMs, usage: data.usageMetadata || null };
  }

  /* ── Key validation — real round-trip, no format checks ──
     Google AI Studio now issues keys in several formats (AIza…,
     AQ.…), so prefix matching is unreliable. The only durable
     test is a minimal generateContent call with the candidate
     key. 4xx auth errors → rejected; 429 means the key works
     but is rate-limited; network failure → verdict unknown. */
  async function validateKey(key) {
    key = (key || "").trim();
    if (!key) return { ok: false, reason: "empty" };
    let last = { ok: false, reason: "error" }, authOk = false;
    try {
      for (const model of modelCandidates()) {
        const res = await fetch(Argus.CONFIG.ENDPOINT_FOR(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        });
        if (res.ok) { rememberModel(model); return { ok: true, model }; }
        // 429 proves the key authenticates, but this model has no free
        // quota headroom — do NOT pin it; keep walking for one that does.
        if (res.status === 429) { authOk = true; continue; }
        const data = await res.json().catch(() => ({}));
        const message = (data.error && data.error.message) || ("HTTP " + res.status);
        // Retired model → try the next candidate before judging the key.
        if (isModelUnavailable(res.status, message)) { last = { ok: false, reason: "error", message }; continue; }
        if ([400, 401, 403].includes(res.status)) return { ok: false, reason: "rejected", message };
        return { ok: false, reason: "error", message };
      }
      return authOk ? { ok: true, reason: "rate-limited" } : last;
    } catch (e) {
      return { ok: false, reason: "network" };
    }
  }

  /* ── Full job-post analysis ─────────────────────────── */
  async function analyzePost({ text, imageB64, imgType }) {
    const parts = [];
    if (imageB64) {
      parts.push({ inline_data: { mime_type: imgType || "image/png", data: imageB64 } });
      parts.push({ text: "Analyze this screenshot of a LinkedIn/WhatsApp job post for authenticity. Extract all visible text and apply the full Argus analysis." });
    } else {
      parts.push({ text: `Analyze this job post:\n\n${text}` });
    }
    const { rawText, sources, latencyMs, usage } = await call({
      systemPrompt: Argus.SYSTEM_PROMPT, parts, useSearch: true,
    });
    const parsed = extractJSON(rawText);
    return { parsed, sources, latencyMs, usage };
  }

  /* ── Interview link deep check (panic button) ───────── */
  async function deepCheckLink(url) {
    const { rawText, sources, latencyMs } = await call({
      systemPrompt: Argus.LINK_CHECK_PROMPT,
      parts: [{ text: `Assess this interview/meeting link or domain: ${url}` }],
      useSearch: true, maxTokens: 2048,
    });
    return { parsed: extractJSON(rawText), sources, latencyMs };
  }

  return { analyzePost, deepCheckLink, validateKey, hasKey: () => !!apiKey() };
})();
