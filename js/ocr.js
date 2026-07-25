/* ═══════════════════════════════════════════════════════════
   ARGONAUT — On-device OCR (screenshot → text)
   ───────────────────────────────────────────────────────────
   Reads the text out of an uploaded job-post screenshot so the
   trained Argus model can analyse it. Uses Tesseract.js, which
   runs entirely in the browser (WASM) — the image is never
   uploaded to any server.

   The engine (~5 MB) is LAZY-LOADED the first time an image is
   scanned, then browser-cached, so the core app stays instant
   and fully offline. If it can't load (e.g. offline, or opened
   via file:// where browsers block it), recognise() rejects and
   the Scanner falls back to asking the user to paste the text.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.ocr = (function () {
  "use strict";

  // Pinned version so the main script, worker, core and language data all match.
  const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

  let libPromise = null;   // resolves once Tesseract global is available
  let workerPromise = null;

  function loadLib() {
    if (window.Tesseract) return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CDN;
      s.async = true;
      s.onload = () => window.Tesseract ? resolve() : reject(new Error("OCR engine loaded but unavailable."));
      s.onerror = () => reject(new Error("Couldn't load the OCR engine. It needs an internet connection the first time you scan an image."));
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function getWorker(onProgress) {
    if (workerPromise) return workerPromise;
    workerPromise = loadLib().then(() => Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (onProgress && m && m.status === "recognizing text" && typeof m.progress === "number")
          onProgress(Math.round(m.progress * 100));
      },
    })).catch((e) => { workerPromise = null; throw e; });   // allow retry
    return workerPromise;
  }

  /* recognise(image) → { text, confidence }
     image: a data-URL string, <img>, canvas, blob, or File. */
  async function recognize(image, onProgress) {
    if (onProgress) onProgress(0);
    const worker = await getWorker(onProgress);
    const res = await worker.recognize(image);
    const data = (res && res.data) || {};
    if (onProgress) onProgress(100);
    return { text: String(data.text || "").trim(), confidence: Math.round(data.confidence || 0) };
  }

  /* Optional: free the worker + memory (e.g. after a batch of images). */
  async function dispose() {
    if (!workerPromise) return;
    try { const w = await workerPromise; if (w && w.terminate) await w.terminate(); } catch (e) { /* ignore */ }
    workerPromise = null;
  }

  return { recognize, dispose, isLoaded: () => !!window.Tesseract };
})();
