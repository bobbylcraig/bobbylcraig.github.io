/* Coastline figures — "The Two-Week Coastline" post.
 *
 *   <div class="cl cl-ruler"      data-src=".../coastline.json"></div>
 *   <div class="cl cl-richardson" data-src=".../coastline.json"></div>
 *
 * Figure 1 ("the ruler"): one fractal-ish coast. A slider sets the ruler
 * length; as it shrinks, the measuring polyline hugs more detail and the
 * reported total climbs. A toggle relabels the SAME walk as a software
 * estimate — ruler = the altitude you estimate at (epic -> story -> subtask ->
 * edge case), the climbing number = estimated hours. Same curve, two labels.
 *
 * Figure 2 ("richardson"): log(measured length) vs log(ruler size) for a few
 * coasts. The line's slope IS (1 - fractal dimension); pick the coast and watch
 * the slope (and the tech metaphor) change.
 *
 * Everything is precomputed in Python (build_coastline.py / coastline.json):
 * the polyline, every ruler walk (which vertices the dividers land on + the
 * length they report), and the log-log table + least-squares slope per coast.
 * The browser does ZERO of the hard math; it swaps and interpolates baked
 * numbers, the same way the timezone / constellation / locks figures do. Plain
 * canvas, colors from the shared --viz-* / theme tokens (dark/light automatic),
 * controls reuse the shared vz-* design system, paints on scroll into view, and
 * respects prefers-reduced-motion.
 */
(function () {
  const rulerNodes = [...document.querySelectorAll(".cl-ruler[data-src]")];
  const richNodes = [...document.querySelectorAll(".cl-richardson[data-src]")];
  if (!rulerNodes.length && !richNodes.length) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const REDUCED = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- tiny shared helpers (mirror the other figures) -------------------
  const cache = {};
  function load(src) {
    if (!cache[src]) cache[src] = fetch(src).then((r) => r.json());
    return cache[src];
  }
  function isDark() {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function cssVar(n, f) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function whenVisible(node, cb) {
    let done = false;
    const fire = () => { if (done) return; done = true; cb(); };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fire(); } });
    }, { threshold: 0, rootMargin: "200px 0px" });
    io.observe(node);
    const check = () => {
      const r = node.getBoundingClientRect();
      if (r.top < (window.innerHeight || 0) + 200 && r.bottom > -200) {
        cleanup(); fire();
      }
    };
    const cleanup = () => {
      window.removeEventListener("scroll", check, { passive: true });
      window.removeEventListener("resize", check);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
  }
  function sizeCanvas(canvas, W, H) {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }
  function withAlpha(hex, a) {
    if (hex[0] !== "#") return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  function onThemeChange(cb) {
    if (window.matchMedia)
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", cb);
  }
  // Coalesce rapid calls (resize) to at most one run per animation frame.
  function rafThrottle(fn) {
    let queued = false, lastArgs;
    return (...args) => {
      lastArgs = args;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
    };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ====================================================================
  //  Figure 1 — "the ruler"
  // ====================================================================
  function buildRuler(node, d) {
    const fig = d.ruler;
    if (!fig) { node.innerHTML = '<p class="vz-caption">Couldn’t load the coastline data.</p>'; return; }
    const coast = fig.coast;            // [[x,y],...] in 0..1-ish space
    const walks = fig.walks;            // coarse -> fine
    const N = walks.length;
    let idx = 0;                        // 0 = coarsest ruler (epic)
    let estimate = false;               // false = coastline km, true = est hours
    let anim = null;

    node.appendChild(el("span", "vz-figure-title",
      "one coast · the length depends on the ruler"));

    const stage = el("div", "cl-stage");
    const canvas = el("canvas", "cl-canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label",
      "A coastline traced by a measuring ruler; as the ruler shortens it follows more detail and the measured length climbs. The length readout updates as you drag.");
    stage.appendChild(canvas);
    // big readout floats top-left over the coast (the corner the coast never
    // reaches — it runs left-to-right along the bottom third)
    const readout = el("div", "cl-readout",
      '<span class="cl-readout-val"></span>' +
      '<span class="cl-readout-unit"></span>');
    stage.appendChild(readout);
    node.appendChild(stage);
    const rdVal = readout.querySelector(".cl-readout-val");
    const rdUnit = readout.querySelector(".cl-readout-unit");

    // controls: ruler slider · mode toggle
    const controls = el("div", "vz-controls");

    const sliderField = el("div", "vz-field");
    sliderField.innerHTML =
      '<span class="vz-field-label cl-slider-label"></span>' +
      '<div class="vz-slider-wrap">' +
      '<span class="cl-slider-end">coarse</span>' +
      `<input class="vz-slider cl-slider" type="range" min="0" max="${N - 1}" step="1" value="0" aria-label="Ruler length">` +
      '<span class="cl-slider-end">fine</span>' +
      '</div>';
    controls.appendChild(sliderField);

    const toggleField = el("div", "vz-field");
    toggleField.innerHTML =
      '<span class="vz-field-label">Read the same walk as</span>' +
      '<div class="vz-seg cl-seg" role="group" aria-label="What the number means">' +
      '<button data-m="0" aria-pressed="true">Coastline</button>' +
      '<button data-m="1" aria-pressed="false">A software estimate</button>' +
      '</div>';
    controls.appendChild(toggleField);
    node.appendChild(controls);

    const cap = el("p", "vz-caption");
    node.appendChild(cap);

    const slider = sliderField.querySelector(".cl-slider");
    const sliderLabel = sliderField.querySelector(".cl-slider-label");

    // ---- geometry / sizing ---------------------------------------------
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    const padX = 18, padTop = 16, padBot = 16;
    // data bounds (coast x is ~0..1; y straddles 0). Compute once.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coast.forEach(([x, y]) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    walks.forEach((w) => w.landed.forEach(([x, y]) => {
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }));
    const dataW = maxX - minX, dataH = (maxY - minY) || 1;

    function size() {
      const rect = stage.getBoundingClientRect();
      W = Math.max(300, rect.width);
      H = Math.round(Math.max(220, Math.min(360, W * 0.5)));
      sizeCanvas(canvas, W, H);
      draw();
    }
    function sx(x) {
      const plotW = W - padX * 2;
      return padX + ((x - minX) / dataW) * plotW;
    }
    function sy(y) {
      const plotH = H - padTop - padBot;
      // flip so +y is up; center the band vertically
      return padTop + plotH * (1 - (y - minY) / dataH);
    }

    // current "displayed" walk index, animated toward idx for a smooth climb
    let shown = 0;

    function draw() {
      if (!W) return;
      const dark = isDark();
      const soft = cssVar("--text-soft", "#6a6a6a");
      const border = cssVar("--border", dark ? "#3a3a3f" : "#d0d0d0");
      const brand = cssVar("--brand", "#1b69d1");
      const measc = cssVar("--viz-chain", "#e0823d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(DPR, DPR);

      // the true coast, faint — the thing we never fully measure
      ctx.strokeStyle = withAlpha(border, dark ? 0.9 : 1);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      coast.forEach(([x, y], i) => {
        const px = sx(x), py = sy(y);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;

      // the measuring polyline for the shown ruler — straight chords between
      // the vertices the dividers landed on. This is what you actually
      // "measure": it cuts every cove the ruler is too long to enter.
      const w = walks[Math.round(shown)];
      const pts = w.landed;
      ctx.strokeStyle = measc;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const px = sx(x), py = sy(y);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();

      // the divider footfalls — a dot at each landing, sized to read as "steps"
      ctx.fillStyle = measc;
      pts.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(sx(x), sy(y), 2.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // a single ruler glyph: the chord of the first step, drawn thicker, so
      // the "this is the stick you're walking with" reads at a glance
      if (pts.length > 1) {
        ctx.strokeStyle = brand;
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(sx(pts[0][0]), sy(pts[0][1]));
        ctx.lineTo(sx(pts[1][0]), sy(pts[1][1]));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineCap = "butt";
      }

      ctx.restore();
    }

    // interpolate the readout number while the walk animates, so the count
    // visibly *climbs* rather than snapping
    function readoutValue(fracIdx) {
      const last = walks.length - 1;
      const lo = Math.max(0, Math.min(last, Math.floor(fracIdx)));
      const hi = Math.max(0, Math.min(last, Math.ceil(fracIdx)));
      const t = fracIdx - lo;
      const a = walks[lo], b = walks[hi];
      if (estimate) return lerp(a.hours, b.hours, t);
      return lerp(a.measured, b.measured, t);
    }
    // Present the abstract 0..1 measured length as a coast-y km figure (the
    // coarsest reads ~1,400km, Britain-ish). Purely cosmetic units on the SAME
    // climbing ratio; the estimate framing reuses the baked hours directly.
    function kmAt(fracIdx) { return Math.round(readoutValue(fracIdx) * 1250 / 10) * 10; }
    function setReadout(fracIdx) {
      if (estimate) {
        rdVal.textContent = Math.round(readoutValue(fracIdx));
        rdUnit.textContent = "hours";
      } else {
        rdVal.textContent = kmAt(fracIdx).toLocaleString();
        rdUnit.textContent = "km";
      }
    }

    function animateTo(target) {
      if (anim) cancelAnimationFrame(anim);
      // Commit the final value synchronously first, so the readout + drawing are
      // always correct even if rAF never ticks (backgrounded tab, reduced
      // motion, headless). The animation below only *replays* the climb as a
      // cosmetic flourish from the previous position.
      const from = shown;
      shown = target;
      draw();
      setReadout(target);
      if (REDUCED || from === target) return;
      const dur = 360;
      let start = null;
      function frame(ts) {
        if (start == null) start = ts;
        const t = Math.min(1, (ts - start) / dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
        shown = lerp(from, target, e);
        draw();
        setReadout(shown);
        if (t < 1) { anim = requestAnimationFrame(frame); }
        else { shown = target; draw(); setReadout(target); }
      }
      anim = requestAnimationFrame(frame);
    }

    function setCaption() {
      const w = walks[idx];
      const band = fig.bands[w.band];
      const segDisplay = Math.round(w.steps);
      if (estimate) {
        cap.innerHTML =
          `<b>${band.label}</b> altitude (${band.altitude}): ${band.ruler}. ` +
          `Estimate from here and the work looks like <b>${Math.round(w.hours)} hours</b>. ` +
          (idx === 0
            ? "The clean number you give in the planning meeting."
            : "Same project. You just looked closer.");
      } else {
        cap.innerHTML =
          `Ruler this long, walked in <b>${segDisplay}</b> straight steps. ` +
          `Every cove shorter than the ruler gets skipped, so the coast reads ` +
          `<b>${kmAt(idx).toLocaleString()} km</b>. ` +
          (idx === 0 ? "Shrink the ruler." : "Shorter ruler, more coves caught, longer coast.");
      }
    }
    function setSliderLabel() {
      const w = walks[idx];
      const band = fig.bands[w.band];
      sliderLabel.textContent = estimate
        ? `Altitude · ${band.label.toLowerCase()}`
        : "Ruler length";
    }
    // Announce a meaningful value to screen readers instead of the bare "0..10"
    // index — the band name plus the number the figure shows.
    function setSliderAria() {
      const band = fig.bands[walks[idx].band];
      slider.setAttribute("aria-valuetext", estimate
        ? `${band.label} altitude · ${Math.round(walks[idx].hours)} hours`
        : `${band.label} ruler · ${kmAt(idx).toLocaleString()} km`);
    }

    // ---- wiring ---------------------------------------------------------
    slider.addEventListener("input", () => {
      idx = +slider.value;
      setSliderLabel();
      setSliderAria();
      setCaption();
      animateTo(idx);
    });
    toggleField.querySelectorAll("[data-m]").forEach((b) =>
      b.addEventListener("click", () => {
        estimate = b.dataset.m === "1";
        toggleField.querySelectorAll("[data-m]").forEach((x) =>
          x.setAttribute("aria-pressed", String((x.dataset.m === "1") === estimate)));
        readout.classList.toggle("is-estimate", estimate);
        setSliderLabel();
        setSliderAria();
        setReadout(idx);
        setCaption();
      }));

    window.addEventListener("resize", rafThrottle(size));
    onThemeChange(draw);

    setSliderLabel();
    setSliderAria();
    setReadout(0);
    setCaption();
    size();
  }

  // ====================================================================
  //  Figure 2 — "richardson"  (log-log plot, slope = fractal dimension)
  // ====================================================================
  function buildRichardson(node, d) {
    const fig = d.richardson;
    if (!fig) { node.innerHTML = '<p class="vz-caption">Couldn’t load the Richardson data.</p>'; return; }
    const coasts = fig.coasts;
    let cIdx = 1;                       // default to the "real coast"
    let reveal = 0;                     // 0..1 line-draw progress

    node.appendChild(el("span", "vz-figure-title",
      "richardson’s plot · slope is the fractal dimension"));

    const stage = el("div", "cl-stage cl-rich-stage");
    const canvas = el("canvas", "cl-canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label",
      "Richardson log-log plot: measured length versus ruler size falls on a straight line whose slope gives the coastline's fractal dimension.");
    stage.appendChild(canvas);
    const dimBadge = el("div", "cl-dim-badge");
    stage.appendChild(dimBadge);
    node.appendChild(stage);

    const controls = el("div", "vz-controls");
    const seg = el("div", "vz-field");
    seg.innerHTML =
      '<span class="vz-field-label">Which coastline</span>' +
      '<div class="vz-seg cl-rich-seg" role="group" aria-label="Coastline">' +
      coasts.map((c, i) => {
        // Short label for narrow screens = the distinctive last word ("A smooth
        // circle" -> "Circle"), so three long names don't overflow the figure.
        const short = c.name.split(" ").pop().replace(/^./, (ch) => ch.toUpperCase());
        return `<button data-c="${i}" aria-pressed="${i === cIdx}">` +
          `<span class="vz-seg-full">${c.name}</span>` +
          `<span class="vz-seg-short">${short}</span>` +
          `</button>`;
      }).join("") +
      "</div>";
    controls.appendChild(seg);
    node.appendChild(controls);

    const cap = el("p", "vz-caption");
    node.appendChild(cap);

    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    const padL = 52, padR = 16, padT = 18, padB = 40;

    // shared plot domain across all coasts so switching is comparable
    let dxMin = Infinity, dxMax = -Infinity, dyMin = Infinity, dyMax = -Infinity;
    coasts.forEach((c) => c.points.forEach((p) => {
      if (p.logRuler < dxMin) dxMin = p.logRuler;
      if (p.logRuler > dxMax) dxMax = p.logRuler;
      if (p.logLen < dyMin) dyMin = p.logLen;
      if (p.logLen > dyMax) dyMax = p.logLen;
    }));
    // pad y a touch
    const yPad = (dyMax - dyMin) * 0.12 || 0.1;
    dyMin -= yPad; dyMax += yPad;

    function size() {
      const rect = stage.getBoundingClientRect();
      W = Math.max(300, rect.width);
      H = Math.round(Math.max(240, Math.min(340, W * 0.62)));
      sizeCanvas(canvas, W, H);
      draw();
    }
    function px(lx) {
      const plotW = W - padL - padR;
      return padL + ((lx - dxMin) / (dxMax - dxMin)) * plotW;
    }
    function py(ly) {
      const plotH = H - padT - padB;
      return padT + plotH * (1 - (ly - dyMin) / (dyMax - dyMin));
    }

    function draw() {
      if (!W) return;
      const dark = isDark();
      const soft = cssVar("--text-soft", "#6a6a6a");
      const border = cssVar("--border", dark ? "#3a3a3f" : "#d0d0d0");
      const brand = cssVar("--brand", "#1b69d1");
      const c = coasts[cIdx];
      // color by metaphor: circle = calm green, coast = brand, legacy = red
      const lineCol = c.key === "circle" ? cssVar("--viz-up", "#1a9d5a")
        : c.key === "legacy" ? cssVar("--viz-down", "#d1495b")
        : brand;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(DPR, DPR);

      // axes
      ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // axis labels
      ctx.fillStyle = soft;
      ctx.font = "11px " + cssVar("--chrome", "sans-serif");
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("log( ruler size )  →  finer", (padL + W - padR) / 2, H - padB + 20);
      ctx.save();
      ctx.translate(14, (padT + H - padB) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "middle";
      ctx.fillText("log( measured length )  →  longer", 0, 0);
      ctx.restore();

      // the points, log-spaced
      const n = c.points.length;
      const upto = Math.max(1, Math.round(n * reveal));
      // fitted line through all points (slope baked); draw it dashed under pts
      const xs = c.points.map((p) => p.logRuler);
      const ys = c.points.map((p) => p.logLen);
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      const b = c.slope;
      const a = my - b * mx;
      ctx.strokeStyle = lineCol; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px(dxMin), py(a + b * dxMin));
      ctx.lineTo(px(dxMax), py(a + b * dxMax));
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      // connect-the-dots polyline (the measured data), revealed left->right
      ctx.strokeStyle = lineCol; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < upto; i++) {
        const X = px(c.points[i].logRuler), Y = py(c.points[i].logLen);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
      ctx.fillStyle = lineCol;
      for (let i = 0; i < upto; i++) {
        ctx.beginPath();
        ctx.arc(px(c.points[i].logRuler), py(c.points[i].logLen), 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function animateReveal() {
      // Draw the complete plot up front so it's correct without rAF, then replay
      // the left-to-right reveal as a flourish only when motion is allowed.
      reveal = 1;
      draw();
      if (REDUCED) return;
      reveal = 0;
      const dur = 700;
      let start = null;
      function frame(ts) {
        if (start == null) start = ts;
        reveal = Math.min(1, (ts - start) / dur);
        draw();
        if (reveal < 1) requestAnimationFrame(frame);
        else { reveal = 1; draw(); }
      }
      requestAnimationFrame(frame);
    }

    function setBadge() {
      const c = coasts[cIdx];
      dimBadge.innerHTML =
        `<span class="cl-dim-label">fractal dimension</span>` +
        `<span class="cl-dim-val">${c.dim.toFixed(2)}</span>` +
        `<span class="cl-dim-sub">slope ${c.slope.toFixed(2)} · D = 1 − slope</span>`;
      dimBadge.classList.remove("is-flat", "is-steep");
      if (c.key === "circle") dimBadge.classList.add("is-flat");
      if (c.key === "legacy") dimBadge.classList.add("is-steep");
    }
    function setCaption() {
      const c = coasts[cIdx];
      cap.innerHTML =
        `<b>${c.name}</b> · ${c.metaphor}. ${c.note}`;
    }

    seg.querySelectorAll("[data-c]").forEach((bb) =>
      bb.addEventListener("click", () => {
        cIdx = +bb.dataset.c;
        seg.querySelectorAll("[data-c]").forEach((x) =>
          x.setAttribute("aria-pressed", String(+x.dataset.c === cIdx)));
        setBadge(); setCaption(); animateReveal();
      }));

    window.addEventListener("resize", rafThrottle(size));
    onThemeChange(draw);

    setBadge();
    setCaption();
    size();
    animateReveal();
  }

  // ---- mount ----------------------------------------------------------
  rulerNodes.forEach((node) => {
    const src = node.dataset.src;
    whenVisible(node, () => load(src).then((d) => buildRuler(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the coastline data.</p>'; console.error(e); }));
  });
  richNodes.forEach((node) => {
    const src = node.dataset.src;
    whenVisible(node, () => load(src).then((d) => buildRichardson(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the Richardson data.</p>'; console.error(e); }));
  });
})();
