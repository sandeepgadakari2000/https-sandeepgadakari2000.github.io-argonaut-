/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Fingerprinting Engine
   Pillar 1: Instant duplicate detection via local text
   fingerprinting (SimHash / LSH)
   Pillar 3: Perceptual screenshot fingerprinting (dHash)
   Zero AI inference cost on recurring patterns.
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

Argus.fp = (function () {

  /* ── Text normalization ─────────────────────────────── */
  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")                 // strip URLs (often randomized)
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ") // emojis
      .replace(/[^\p{L}\p{N}\s@.]/gu, " ")             // punctuation noise
      .replace(/\s+/g, " ")
      .trim();
  }

  /* ── FNV-1a 32-bit ──────────────────────────────────── */
  function fnv1a(str, seed) {
    let h = (seed >>> 0) ^ 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* 64-bit token hash as BigInt (two seeded FNV passes) */
  function hash64(str) {
    const hi = BigInt(fnv1a(str, 0x9747b28c));
    const lo = BigInt(fnv1a(str, 0x2f0e1eba));
    return (hi << 32n) | lo;
  }

  /* Exact fingerprint of the whole normalized text (hex) */
  function exactHash(text) {
    const n = normalize(text);
    return hash64(n).toString(16).padStart(16, "0");
  }

  /* ── SimHash-64 over words + word-bigrams ───────────── */
  function simhash(text) {
    const words = normalize(text).split(" ").filter(w => w.length > 1);
    if (!words.length) return 0n;
    const tokens = [...words];
    for (let i = 0; i < words.length - 1; i++) tokens.push(words[i] + "_" + words[i + 1]);
    const vec = new Array(64).fill(0);
    for (const tok of tokens) {
      const h = hash64(tok);
      for (let b = 0; b < 64; b++) {
        vec[b] += (h >> BigInt(b)) & 1n ? 1 : -1;
      }
    }
    let out = 0n;
    for (let b = 0; b < 64; b++) if (vec[b] > 0) out |= 1n << BigInt(b);
    return out;
  }

  /* ── Hamming distance between two 64-bit BigInts ────── */
  function hamming(a, b) {
    let x = a ^ b, d = 0;
    while (x) { d += Number(x & 1n); x >>= 1n; }
    return d;
  }

  /* ── Perceptual image hash (dHash 9×8 → 64-bit) ─────── */
  function imageDHash(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = 9; c.height = 8;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 9, 8);
          const px = ctx.getImageData(0, 0, 9, 8).data;
          const gray = [];
          for (let i = 0; i < px.length; i += 4) {
            gray.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
          }
          let bits = 0n, bit = 0n;
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              if (gray[y * 9 + x] > gray[y * 9 + x + 1]) bits |= 1n << bit;
              bit++;
            }
          }
          resolve(bits);
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = dataUrl;
    });
  }

  /* ── Extract identifiers for scam-library cross-check ─ */
  function extractIdentifiers(text) {
    const t = text || "";
    const phones = [...new Set((t.match(/(?:\+?91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}/g) || []).map(s => s.replace(/[-\s]/g, "")))];
    const upi    = [...new Set(t.match(/[a-z0-9._-]{2,}@(?:ybl|oksbi|okaxis|okhdfcbank|okicici|paytm|upi|apl|ibl|axl)/gi) || [])];
    const emails = [...new Set(t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [])];
    return { phones, upi, emails };
  }

  return { normalize, exactHash, simhash, hamming, imageDHash, extractIdentifiers, hash64 };
})();
