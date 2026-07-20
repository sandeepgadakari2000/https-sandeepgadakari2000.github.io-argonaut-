/* ═══════════════════════════════════════════════════════════
   ARGONAUT — Landing: “The Voyage”
   Vanilla port of the Argonaut Landing (Standalone) design.
   A full-viewport three.js particle field morphs through four
   formations — trireme → phyllotaxis sphere → Argus eye →
   scan vortex — as the visitor scrolls through four exhibit
   panels. GSAP drives camera moves and panel transitions.
   Shown only on the Home route via Argus.landing.show()/hide().
   ═══════════════════════════════════════════════════════════ */
window.Argus = window.Argus || {};

(function () {
  const DENSITY = 6000;        // particle count
  const MOUSE_FORCE = 1.4;     // repulsion strength

  /* mode: "off" (hidden) · "full" (Home — panels, wheel nav, HUD)
     · "ambient" (app routes — canvas persists as a fixed background
     and the formation morphs with page scroll) */
  let mode = "off", inited = false, staticMode = false;
  let idx = 0, aIdx = 0, lock = false, spinLock = false;
  let raf = 0, teleTimer = 0, latency = 12, scanned = 0;

  /* three.js objects */
  let renderer, scene, cam, points, mat, clock, time = 0;
  let look, spin, rock, mouse, m3, m3t, ray, plane, tmpV;
  let N, forms, fa, ta, cur, morph, ox, oy, oz, ovx, ovy, ovz;

  const root = () => document.getElementById("landing");
  const $ = id => document.getElementById(id);

  const CFG = [
    { cam: [0, 3.5, 27], look: [0, 0.5, 0], spin: 0.03, rock: 0.035, name: "TRIREME · AEGEAN" },
    { cam: [8, 5.5, 23], look: [0, 0, 0],   spin: 0.14, rock: 0,     name: "PHYLLOTAXIS · φ" },
    { cam: [0, 0.5, 22], look: [0, 0, 0],   spin: 0.02, rock: 0.012, name: "ARGUS PANOPTES" },
    { cam: [0, 8.5, 25], look: [0, -0.5, 0],spin: 0.55, rock: 0,     name: "SCAN VORTEX" },
  ];

  /* ── Formation point clouds ─────────────────────────── */
  function genForms(n) {
    const boat = new Float32Array(n * 3), sph = new Float32Array(n * 3),
          eye = new Float32Array(n * 3), vor = new Float32Array(n * 3);
    const R = Math.random, PI = Math.PI, TAU = PI * 2;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      /* Greek boat on waves */
      {
        const r = R(); let x, y, z;
        if (r < 0.42) {                                    // sea
          x = (R() * 2 - 1) * 24; z = (R() * 2 - 1) * 14;
          y = -3.3 + Math.sin(x * 0.45) * 0.45 + Math.sin(z * 0.8 + x * 0.2) * 0.3;
        } else if (r < 0.72) {                             // hull
          const t = R() * 2 - 1, a = PI + R() * PI, rad = 2.5 * (1 - 0.55 * Math.pow(Math.abs(t), 2.2));
          x = t * 12; y = Math.sin(a) * rad * 1.05 + Math.pow(Math.abs(t), 3) * 3.4 - 0.4; z = Math.cos(a) * rad;
        } else if (r < 0.94) {                             // sail
          const u = R(), v = R();
          x = (u - 0.5) * 7.2 * (1 - v * 0.22); y = 1.4 + v * 6.6;
          z = Math.sin(u * PI) * 1.5 * (0.45 + 0.55 * Math.sin(v * PI));
        } else {                                           // mast
          x = (R() - 0.5) * 0.3; y = -0.4 + R() * 8.6; z = (R() - 0.5) * 0.3;
        }
        boat[j] = x + (R() - 0.5) * 0.18; boat[j + 1] = y + (R() - 0.5) * 0.18; boat[j + 2] = z + (R() - 0.5) * 0.18;
      }
      /* Phyllotaxis sphere (golden angle) */
      {
        const k = i + 0.5, inc = Math.acos(1 - 2 * k / n), az = i * 2.39996323;
        let rad = 8.6 + Math.sin(i * 0.13) * 0.3;
        rad *= 1 + 0.05 * Math.sin(az * 2 + inc * 4);
        sph[j] = rad * Math.sin(inc) * Math.cos(az);
        sph[j + 1] = rad * Math.cos(inc);
        sph[j + 2] = rad * Math.sin(inc) * Math.sin(az);
      }
      /* The Argus eye */
      {
        const r = R(); let x, y, z;
        if (r < 0.34) {                                    // iris annulus with striations
          const a = R() * TAU; let rad = 2.3 + Math.pow(R(), 0.65) * 2.7;
          rad += Math.sin(a * 22) * 0.1;
          x = Math.cos(a) * rad; y = Math.sin(a) * rad * 0.95; z = 0.5 - rad * 0.12 + (R() - 0.5) * 0.4;
        } else if (r < 0.5) {                              // pupil
          const a = R() * TAU, rad = Math.sqrt(R()) * 1.5;
          x = Math.cos(a) * rad; y = Math.sin(a) * rad; z = 0.9 + (R() - 0.5) * 0.35;
        } else if (r < 0.84) {                             // almond lids
          const xx = R() * 2 - 1, k2 = 1 - xx * xx, s = R() < 0.5 ? 1 : -1;
          x = xx * 10.8; y = s * (k2 * 5.1) + (R() - 0.5) * 0.5;
          z = -(x * x + y * y) * 0.012 + (R() - 0.5) * 0.5;
        } else {                                           // halo dust
          const a = R() * TAU, rad = 6.5 + R() * 5.5;
          x = Math.cos(a) * rad * 1.35; y = Math.sin(a) * rad * 0.75; z = (R() - 0.5) * 2.5;
        }
        eye[j] = x; eye[j + 1] = y; eye[j + 2] = z;
      }
      /* Scanning vortex cone */
      {
        const v = Math.pow(R(), 0.75), y = 7.5 - 15 * v;
        const rad = 0.35 + v * 7.8 + (R() - 0.5) * 0.5;
        const a = (i % 5) / 5 * TAU + v * 6.2 + (R() - 0.5) * 0.5;
        vor[j] = Math.cos(a) * rad; vor[j + 1] = y; vor[j + 2] = Math.sin(a) * rad;
      }
    }
    return [boat, sph, eye, vor];
  }

  function dotTexture() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  function buildParticles() {
    N = Math.max(500, Math.min(20000, DENSITY));
    forms = genForms(N);
    fa = new Float32Array(forms[idx]);
    ta = forms[idx];
    cur = new Float32Array(N * 3);
    morph = { t: 1 };
    ox = new Float32Array(N); oy = new Float32Array(N); oz = new Float32Array(N);
    ovx = new Float32Array(N); ovy = new Float32Array(N); ovz = new Float32Array(N);
    const pos = new Float32Array(fa);
    const col = new Float32Array(N * 3);
    /* Bronze / light bronze / terracotta / warm sepia */
    const pal = [[0.722, 0.451, 0.2], [0.831, 0.639, 0.451], [0.886, 0.447, 0.357], [0.545, 0.353, 0.169]];
    for (let i = 0; i < N; i++) {
      const r = Math.random();
      const c = pal[r < 0.34 ? 0 : r < 0.62 ? 1 : r < 0.8 ? 3 : 2];
      const b = 0.88 + Math.random() * 0.24;
      col[i * 3] = Math.min(1, c[0] * b); col[i * 3 + 1] = Math.min(1, c[1] * b); col[i * 3 + 2] = Math.min(1, c[2] * b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    mat = new THREE.PointsMaterial({
      size: 0.17, map: dotTexture(), vertexColors: true,
      transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true,
    });
    points = new THREE.Points(geo, mat);
    scene.add(points);
  }

  /* ── Input bindings (guarded by `mode`) ─────────────── */
  function interactionBlocked(e) {
    if (mode !== "full" || staticMode) return true;
    const mr = document.getElementById("modal-root");
    if (mr && mr.childElementCount > 0) return true;
    const t = e && e.target;
    if (t && t.closest && t.closest("input,textarea,select,[contenteditable]")) return true;
    return false;
  }

  function bind() {
    window.addEventListener("resize", () => { if (mode !== "off" && renderer) resize(); });
    /* ambient mode: page scroll drives the formation morph */
    window.addEventListener("scroll", () => {
      if (mode !== "ambient" || staticMode) return;
      applyScrollFormation();
    }, { passive: true });
    window.addEventListener("wheel", (e) => {
      if (interactionBlocked(e) || Math.abs(e.deltaY) < 20) return;
      nav(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });
    window.addEventListener("keydown", (e) => {
      if (interactionBlocked(e)) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); nav(1); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); nav(-1); }
    });
    window.addEventListener("mousemove", (e) => {
      if (mode === "off" || !mouse) return;
      mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    document.addEventListener("mouseleave", () => {
      if (!mouse) return;
      mouse.set(-99, -99); m3t.set(999, 999, 0);
    });
    let ty = null;
    window.addEventListener("touchstart", (e) => { ty = e.touches[0].clientY; }, { passive: true });
    window.addEventListener("touchend", (e) => {
      if (ty === null || interactionBlocked(e)) { ty = null; return; }
      const d = ty - e.changedTouches[0].clientY;
      if (Math.abs(d) > 55) nav(d > 0 ? 1 : -1);
      ty = null;
    }, { passive: true });
  }

  function bindUI() {
    root().querySelectorAll("[data-dot]").forEach(el =>
      el.addEventListener("click", () => goTo(+el.dataset.dot)));
    root().querySelectorAll("[data-lnext]").forEach(el =>
      el.addEventListener("click", () => nav(1)));
    root().querySelectorAll("[data-go]").forEach(el =>
      el.addEventListener("click", () => Argus.app.go(el.dataset.go)));
    const run = $("landing-scan-run"), input = $("landing-scan-input");
    const launch = () => {
      const text = (input.value || "").trim();
      if (text && Argus.scanner.prefill) Argus.scanner.prefill(text);
      scanPulse();
      setTimeout(() => Argus.app.go("scanner"), text ? 850 : 250);
    };
    run.addEventListener("click", launch);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") launch(); });
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }

  /* ── Render loop ────────────────────────────────────── */
  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const t = time;
    /* mouse → world point on z=0 plane (re-raycast each frame; camera moves) */
    if (mouse.x > -50) {
      ray.setFromCamera(mouse, cam);
      if (ray.ray.intersectPlane(plane, tmpV)) m3t.copy(tmpV);
    }
    m3.lerp(m3t, 0.18);
    const mx = m3.x, my = m3.y, mz = m3.z;
    const force = MOUSE_FORCE * 0.13;
    const Rr = 4.2, R2 = Rr * Rr;
    const mt = morph.t;
    const pos = points.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const bx = fa[j] + (ta[j] - fa[j]) * mt;
      const by = fa[j + 1] + (ta[j + 1] - fa[j + 1]) * mt;
      const bz = fa[j + 2] + (ta[j + 2] - fa[j + 2]) * mt;
      cur[j] = bx; cur[j + 1] = by; cur[j + 2] = bz;
      const breath = Math.sin(t * 1.3 + bx * 0.32 + bz * 0.21) * 0.28;
      const dx = bx - mx, dy = by - my, dz = bz - mz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < R2 && d2 > 0.0001) {
        const d = Math.sqrt(d2), f = (1 - d / Rr) * (1 - d / Rr) * force;
        ovx[i] += dx / d * f; ovy[i] += dy / d * f; ovz[i] += dz / d * f;
      }
      ovx[i] = (ovx[i] - ox[i] * 0.045) * 0.9;
      ovy[i] = (ovy[i] - oy[i] * 0.045) * 0.9;
      ovz[i] = (ovz[i] - oz[i] * 0.045) * 0.9;
      ox[i] += ovx[i]; oy[i] += ovy[i]; oz[i] += ovz[i];
      pos[j] = bx + ox[i];
      pos[j + 1] = by + breath + oy[i];
      pos[j + 2] = bz + oz[i];
    }
    points.geometry.attributes.position.needsUpdate = true;
    if (!spinLock) points.rotation.y += spin.v * dt;
    points.rotation.z = Math.sin(t * 0.55) * rock.v;
    cam.lookAt(look.x, look.y, look.z);
    renderer.render(scene, cam);
  }

  /* ── Panel navigation ───────────────────────────────── */
  function nav(d) {
    const i = idx + d;
    if (i < 0 || i > 3) return;
    goTo(i);
  }

  /* Camera + particle-morph tweens only — shared by the Home
     panel navigation and the ambient scroll-driven morphing. */
  function formationTo(i) {
    const g = window.gsap, S = CFG[i];
    fa.set(cur);
    ta = forms[i];
    morph.t = 0;
    g.to(morph, { t: 1, duration: 2.1, ease: "power2.inOut", overwrite: "auto" });
    g.to(cam.position, { x: S.cam[0], y: S.cam[1], z: S.cam[2], duration: 2.2, ease: "power2.inOut", overwrite: "auto" });
    g.to(look, { x: S.look[0], y: S.look[1], z: S.look[2], duration: 2.2, ease: "power2.inOut", overwrite: "auto" });
    g.to(spin, { v: S.spin, duration: 2, overwrite: "auto" });
    g.to(rock, { v: S.rock, duration: 2, overwrite: "auto" });
    const rot = points.rotation, tau = Math.PI * 2;
    spinLock = true;
    g.to(rot, { y: Math.ceil(rot.y / tau) * tau, duration: 2, ease: "power2.inOut", overwrite: "auto", onComplete: () => { spinLock = false; } });
  }

  function goTo(i) {
    if (i === idx || lock) return;
    if (staticMode) { swapStatic(idx, i); idx = i; syncChrome(i); return; }
    if (!scene) return;
    lock = true;
    setTimeout(() => { lock = false; }, 1150);
    const old = idx;
    formationTo(i);
    idx = i;
    aIdx = i;
    swapPanels(old, i);
    syncChrome(i);
  }

  /* Map document scroll progress (0..1) onto the four formations.
     No lock here — formationTo() tweens overwrite gracefully, and
     changes only fire when the scroll segment actually crosses. */
  function applyScrollFormation() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, (window.scrollY || doc.scrollTop || 0) / max));
    const seg = Math.min(3, Math.floor(p * 4));
    if (seg !== aIdx) { aIdx = seg; formationTo(seg); }
  }

  function swapPanels(a, b) {
    const g = window.gsap, r = root();
    const oldEls = r.querySelectorAll('[data-panel="' + a + '"] .el');
    const newEls = r.querySelectorAll('[data-panel="' + b + '"] .el');
    g.to(oldEls, { autoAlpha: 0, y: -26, duration: 0.45, stagger: 0.04, ease: "power2.in", overwrite: "auto" });
    g.fromTo(newEls, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.38, overwrite: "auto" });
  }

  function swapStatic(a, b) {
    const r = root();
    r.querySelector('[data-panel="' + a + '"]').style.display = "none";
    r.querySelector('[data-panel="' + b + '"]').style.display = "";
  }

  function syncChrome(i) {
    const r = root(), g = window.gsap;
    const fm = $("landing-formation");
    if (fm) fm.textContent = CFG[i].name;
    r.querySelectorAll("[data-dot]").forEach((el) => {
      const k = +el.getAttribute("data-dot"), on = k === i;
      if (g && !staticMode) {
        g.to(el, {
          backgroundColor: on ? "#B87333" : "rgba(184,115,51,0)",
          borderColor: on ? "#B87333" : "rgba(184,115,51,0.45)",
          scale: on ? 1.3 : 1, duration: 0.5, overwrite: "auto",
        });
      } else {
        el.style.background = on ? "#B87333" : "transparent";
        el.style.borderColor = on ? "#B87333" : "rgba(184,115,51,0.45)";
        el.style.transform = on ? "scale(1.3)" : "scale(1)";
      }
    });
  }

  function introUI() {
    const g = window.gsap, r = root();
    r.querySelectorAll("[data-panel]").forEach(p => p.classList.add("panel-ready"));
    [1, 2, 3].forEach(p => g.set(r.querySelectorAll('[data-panel="' + p + '"] .el'), { autoAlpha: 0 }));
    g.fromTo(r.querySelectorAll('[data-panel="0"] .el'), { autoAlpha: 0, y: 38 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: "power3.out", delay: 0.25 });
    const hud = r.querySelector('[data-chrome="hud"]');
    if (hud) g.fromTo(hud, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.5 });
    g.fromTo(r.querySelectorAll('[data-chrome="rail"], [data-chrome="hint"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, delay: 0.7 });
    syncChrome(0);
  }

  function scanPulse() {
    if (spin && window.gsap) gsap.fromTo(spin, { v: 3.2 }, { v: 0.55, duration: 2.8, ease: "power2.out", overwrite: "auto" });
  }

  /* ── HUD telemetry ──────────────────────────────────── */
  function updateHud() {
    const l = $("landing-latency"), s = $("landing-scanned");
    if (l) l.textContent = latency;
    if (s) s.textContent = scanned.toLocaleString("en-IN");
  }
  function startTelemetry() {
    stopTelemetry();
    teleTimer = setInterval(() => {
      latency = 8 + Math.floor(Math.random() * 11);
      updateHud();
    }, 1600);
  }
  function stopTelemetry() { if (teleTimer) { clearInterval(teleTimer); teleTimer = 0; } }

  /* HUD counter reflects real on-device activity only */
  function seedStats() {
    try {
      scanned = Argus.store.stats().scanned || 0;
      updateHud();
    } catch (e) { /* store not ready yet */ }
  }

  /* ── Init / show / hide ─────────────────────────────── */
  function initScene() {
    const canvas = $("landing-canvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xF9F9F6, 24, 62);
    cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const c0 = CFG[0];
    cam.position.set(c0.cam[0], c0.cam[1], c0.cam[2]);
    look = { x: c0.look[0], y: c0.look[1], z: c0.look[2] };
    spin = { v: c0.spin };
    rock = { v: c0.rock };
    mouse = new THREE.Vector2(-99, -99);
    m3 = new THREE.Vector3(999, 999, 0);
    m3t = new THREE.Vector3(999, 999, 0);
    ray = new THREE.Raycaster();
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    tmpV = new THREE.Vector3();
    buildParticles();
    resize();
    clock = new THREE.Clock();
  }

  function initStatic() {
    /* Fallback when WebGL/motion is unavailable: panels swap
       instantly via the dot rail, no particle canvas. */
    staticMode = true;
    const r = root();
    r.querySelectorAll("[data-panel]").forEach((p, k) => {
      p.classList.add("panel-ready");
      if (k !== 0) p.style.display = "none";
    });
    const hint = r.querySelector('[data-chrome="hint"]');
    if (hint) hint.style.display = "none";
    syncChrome(0);
  }

  function init() {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && window.THREE && window.gsap) {
      try { initScene(); } catch (e) { console.error("Argus landing init failed", e); staticMode = true; }
    } else staticMode = true;
    if (staticMode) initStatic();
    bind();
    bindUI();
    seedStats();
    inited = true;
  }

  function show() {
    document.body.classList.remove("landing-ambient");
    document.body.classList.add("landing-on");
    document.getElementById("view").innerHTML = "";
    if (!inited) init();
    mode = "full";
    seedStats();
    updateHud();
    startTelemetry();
    if (!staticMode) {
      resize();
      clock.getDelta();               // swallow time spent hidden
      if (!raf) tick();
      if (!show._introDone) { introUI(); show._introDone = true; }
      // ambient scrolling may have morphed away — glide back to the
      // formation matching the currently visible panel
      if (aIdx !== idx) { formationTo(idx); aIdx = idx; }
    }
  }

  /* App routes: keep the canvas alive as a fixed background that
     morphs with page scroll. Panels/HUD/rail/hint are hidden and
     the whole layer is pointer-events:none (see style.css), so
     forms and buttons above it stay fully interactive. */
  function ambient() {
    if (!inited) init();
    if (staticMode) { hide(); return; }   // no WebGL/motion → plain background
    document.body.classList.remove("landing-on");
    document.body.classList.add("landing-ambient");
    if (mode !== "ambient") aIdx = idx;   // entering from Home/off: formation on screen
    mode = "ambient";                     // route→route: keep morphing from where it is
    stopTelemetry();                      // HUD is hidden — nothing to tick
    resize();
    clock.getDelta();                     // swallow time spent hidden
    if (!raf) tick();
    applyScrollFormation();               // settle to the page's scroll segment
  }

  function hide() {
    mode = "off";
    document.body.classList.remove("landing-on");
    document.body.classList.remove("landing-ambient");
    stopTelemetry();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  Argus.landing = { show, ambient, hide, isActive: () => mode === "full" };
})();
