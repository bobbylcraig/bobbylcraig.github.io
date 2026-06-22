/* Time-zone figures — "The 9am Wave" for the time/timezones post.
 *
 *   <div class="tz tz-wave" data-src="timezones.json"></div>
 *
 * One innocent promise — "send this at 9:00 in the customer's local time" —
 * fired across ~two dozen zones spanning the globe, and then what happens to
 * that promise when the *world* changes the rules. The user picks a scenario
 * (a normal day, Samoa jumping the date line, the EU abolishing DST, the
 * spring-forward gap, the fall-back double-tap) and watches the wave re-form:
 * sends shift an hour, leap a whole day, fire twice, or never fire at all.
 *
 * Everything is precomputed in Python against real IANA tz data (see
 * build_timezones.py / timezones.json). The browser does ZERO timezone math —
 * it animates baked instants and reads baked per-city verdicts, the same way
 * the constellation and locking posts swap precomputed state. Plain canvas;
 * colors read from the shared --viz-* / theme tokens so dark/light is
 * automatic. Controls reuse the shared vz-* design system. Each figure paints
 * only once it scrolls into view, and respects prefers-reduced-motion.
 */
(function () {
  const nodes = [...document.querySelectorAll(".tz-wave[data-src]")];
  const clocks = [...document.querySelectorAll(".tz-clock[data-src]")];
  if (!nodes.length && !clocks.length) return;

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
    // threshold 0 (any pixel), not a ratio: the mount reserves height via CSS,
    // and a ratio threshold can be flaky on a freshly-laid-out box. rootMargin
    // pre-loads it just before it scrolls in.
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fire(); } });
    }, { threshold: 0, rootMargin: "200px 0px" });
    io.observe(node);
    // Fallback: if IntersectionObserver never delivers (some embedded/headless
    // webviews don't), build on the first scroll/resize that leaves the node in
    // or near the viewport, and as a last resort shortly after load.
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
  // Map a verdict to a semantic token (resolved per-draw so themes flip).
  function verdictColor(v) {
    if (v === "ontime") return cssVar("--brand", "#1b69d1");
    if (v === "shifted") return cssVar("--viz-chain", "#e0823d");
    if (v === "twice") return cssVar("--viz-down", "#d1495b");
    if (v === "gap") return cssVar("--viz-down", "#d1495b");
    return cssVar("--text-soft", "#6a6a6a");
  }

  // Format a timeline offset (hours from the scenario's UTC anchor) as a short
  // UTC wall-clock label, e.g. 13.5 -> "13:30", -2 -> "22:00" (prev day).
  function fmtClock(h) {
    let m = Math.round(h * 60);
    m = ((m % 1440) + 1440) % 1440;
    const hh = Math.floor(m / 60), mm = m % 60;
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }

  // ---- shared canvas primitives (both figures draw on a plain 2D context) ----
  // Size a canvas for crisp HiDPI rendering: backing store in device pixels, CSS
  // box in logical px. Callers ctx.scale(DPR, DPR) once per frame after clearing.
  function sizeCanvas(canvas, W, H) {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }
  // Trace a rounded rectangle (radius clamped to fit). Path only — caller fills
  // or strokes. arcTo keeps it to four corner arcs with no trig.
  function roundRect(c, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  // #rrggbb -> rgba() with the given alpha (passes through non-hex like rgb()).
  function withAlpha(hex, a) {
    if (hex[0] !== "#") return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  // Redraw on color-scheme flips so canvas colors track the theme. (Resize is
  // wired per-figure since each owns its own size() closure.)
  function onThemeChange(cb) {
    if (window.matchMedia)
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", cb);
  }
  // Coalesce rapid calls (pointermove, resize) to at most one run per frame, so
  // a burst of events causes a single canvas redraw instead of one per event.
  function rafThrottle(fn) {
    let queued = false, lastArgs;
    return (...args) => {
      lastArgs = args;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
    };
  }

  function build(node, d) {
    const cities = d.cities;
    const byId = {};
    cities.forEach((c) => (byId[c.id] = c));
    const scenarios = d.scenarios;
    // Open on a *broken* scenario, not the clean one — the first glance should
    // show something visibly wrong (a row firing twice, a row never firing),
    // so "A normal Tuesday" becomes the thing you click toward. Prefer the
    // fall-back double-fire; fall back to any non-"normal" scenario.
    let sIdx = scenarios.findIndex((s) => s.key === "fall");
    if (sIdx < 0) sIdx = scenarios.findIndex((s) => s.key !== "normal");
    if (sIdx < 0) sIdx = 0;
    let t = 0;                    // wave sweep progress 0..1
    let rafSweep = null;

    // ---- scaffold: title · stage(canvas + verdict badge) · controls · caption
    node.appendChild(el("span", "vz-figure-title",
      "the promise · “send at 9:00 in the customer’s local time”"));

    const stage = el("div", "tz-stage");
    const canvas = el("canvas", "tz-canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label",
      "Map of cities firing a 9am-local job; under a daylight-saving change some fire twice and some never fire. The running tally and caption below summarize the misfires.");
    stage.appendChild(canvas);
    const tip = el("div", "cx-tip");        // reuse the shared tooltip chrome
    stage.appendChild(tip);
    node.appendChild(stage);

    // scenario switcher (segmented). The scenario `title` is a full sentence
    // used in the caption; the chips need short, scannable labels instead, so
    // map each key to a compact label (full) + an even shorter one (narrow).
    const CHIP = {
      normal: ["Normal day", "Normal"],
      samoa:  ["Samoa jumps", "Samoa"],
      eu:     ["EU drops DST", "EU"],
      spring: ["Spring gap", "Gap"],
      fall:   ["Fall double", "Double"],
    };
    const controls = el("div", "vz-controls");
    const seg = el("div", "vz-field");
    seg.innerHTML =
      '<span class="vz-field-label">What the world does</span>' +
      '<div class="vz-seg tz-seg" role="group" aria-label="Scenario">' +
      scenarios.map((s, i) => {
        const [full, short] = CHIP[s.key] || [s.title, s.title];
        return `<button data-s="${i}" aria-pressed="${i === sIdx}">` +
          `<span class="vz-seg-full">${full}</span>` +
          `<span class="vz-seg-short">${short}</span>` +
          `</button>`;
      }).join("") +
      "</div>";
    controls.appendChild(seg);

    // Verdict tally + replay, right-aligned in the same controls row. Kept OUT
    // of the canvas: the wave's diagonal of markers + right-edge UTC times means
    // no stage corner is ever clear, so an on-canvas badge always covers
    // something. Here it states the stakes without overlapping the strip. It
    // carries its own label so it mirrors the scenario field's label-on-top
    // shape and the two fields top-align cleanly across the controls row.
    const metaField = el("div", "vz-field tz-wave-meta");
    metaField.innerHTML =
      '<span class="vz-field-label">What happens</span>' +
      '<div class="tz-wave-meta-row">' +
      '<span class="tz-badge-verdict"></span>' +
      '<button class="tz-replay" type="button" aria-label="Replay the wave">↻ Replay</button>' +
      '</div>';
    controls.appendChild(metaField);
    node.appendChild(controls);
    const badgeVerdict = metaField.querySelector(".tz-badge-verdict");

    const cap = el("p", "vz-caption");
    node.appendChild(cap);

    // ---- canvas sizing --------------------------------------------------
    const ctx = canvas.getContext("2d");
    // padR reserves a right gutter for the per-row UTC times (e.g. "05:30 +
    // 06:30"), so they sit clear of both the canvas edge and the markers.
    let W = 0, H = 0, rowH = 0, padL = 0, padR = 78, padT = 30, padB = 26;
    const ROW_MIN = 17, ROW_MAX = 26;
    function size() {
      const rect = stage.getBoundingClientRect();
      W = Math.max(300, rect.width);
      // label gutter scales a little with width but stays readable
      padL = W < 460 ? 84 : 116;
      rowH = Math.max(ROW_MIN, Math.min(ROW_MAX, (W * 0.62 - padT - padB) / cities.length));
      H = Math.round(padT + padB + rowH * cities.length);
      sizeCanvas(canvas, W, H);
      draw();
    }

    // timeline x: offsets run roughly -12..+14 across scenarios; pad the domain
    // a touch so end labels don't clip. Fixed domain so the wave's geometry is
    // comparable across scenarios.
    const X0 = -2, X1 = 26;       // hours from anchor (anchor = 00:00 UTC)
    function tx(hoursFromAnchor) {
      const plotW = W - padL - padR;
      return padL + ((hoursFromAnchor - X0) / (X1 - X0)) * plotW;
    }
    function rowY(i) { return padT + rowH * (i + 0.5); }

    // ---- draw -----------------------------------------------------------
    function draw() {
      if (!W) return;
      const dark = isDark();
      const sc = scenarios[sIdx];
      const text = cssVar("--text", dark ? "#e8e8ea" : "#111");
      const soft = cssVar("--text-soft", "#6a6a6a");
      const border = cssVar("--border", dark ? "#3a3a3f" : "#d0d0d0");
      const brand = cssVar("--brand", "#1b69d1");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(DPR, DPR);

      // vertical hour gridlines every 6h + top axis labels (UTC wall clock)
      ctx.font = "10px " + cssVar("--mono", "monospace");
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.strokeStyle = border; ctx.lineWidth = 1;
      for (let h = 0; h <= 24; h += 6) {
        const x = tx(h);
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(x, padT - 6); ctx.lineTo(x, H - padB + 4); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = soft;
        ctx.fillText(fmtClock(h), x, padT - 12);
      }
      // "UTC →" sits in the left name gutter (clear of the 00:00 tick), labeling
      // the axis that the per-row times on the right are measured in.
      ctx.textAlign = "left";
      ctx.fillStyle = soft;
      ctx.font = "10px " + cssVar("--mono", "monospace");
      ctx.fillText("UTC", 6, padT - 12);

      // the sweeping wavefront: a soft vertical line that travels across the
      // domain as t goes 0..1, lighting each city's marker as it passes.
      const frontH = X0 + (X1 - X0) * t;
      const frontX = tx(frontH);

      // rows
      const labelFont = "11px " + cssVar("--chrome", "sans-serif");
      const subFont = "9px " + cssVar("--mono", "monospace");
      sc.cities.forEach((cv, i) => {
        const meta = byId[cv.id];
        const y = rowY(i);
        // row baseline rule
        ctx.strokeStyle = border; ctx.globalAlpha = 0.25; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.globalAlpha = 1;

        // city label (left gutter)
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = text; ctx.font = labelFont;
        ctx.fillText(meta.city, 6, y);

        const col = verdictColor(cv.verdict);

        if (cv.verdict === "gap") {
          // The instant the calendar deleted: there is no UTC time to plot, so
          // park a hollow ✕ just inside the gutter to read as "no instant."
          const mx = padL + 18;
          ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(mx - 4, y - 4); ctx.lineTo(mx + 4, y + 4);
          ctx.moveTo(mx + 4, y - 4); ctx.lineTo(mx - 4, y + 4);
          ctx.stroke(); ctx.globalAlpha = 1;
          ctx.textAlign = "left"; ctx.fillStyle = col; ctx.font = subFont;
          ctx.fillText("never fires", mx + 10, y);
          return;
        }

        // one or two instant markers (two = fires twice). Markers are always
        // legible; the wavefront just *pops* each one as it sweeps past (a
        // highlight, not the only reveal) so the data reads even if the
        // animation is throttled or skipped.
        cv.offsets.forEach((off, k) => {
          const x = tx(off);
          const passed = off <= frontH + 1e-6;
          const r = passed ? 4.6 : 4.2;
          ctx.globalAlpha = passed ? 1 : 0.6;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          if (cv.verdict === "twice") {
            // ring the doubles so the "fired twice" reads even at a glance
            ctx.globalAlpha = passed ? 0.55 : 0.3; ctx.strokeStyle = col; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        });

        // right-edge UTC time(s) for this row, right-aligned within the gutter
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.font = subFont;
        ctx.fillStyle = cv.verdict === "ontime" ? soft : col;
        const times = cv.offsets.map(fmtClock).join(" + ");
        ctx.fillText(times, W - 6, y);
      });

      // the wavefront, on top
      if (t > 0 && t < 1) {
        ctx.strokeStyle = brand; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(frontX, padT - 6); ctx.lineTo(frontX, H - padB + 4); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    // ---- the sweep animation -------------------------------------------
    function runSweep() {
      if (rafSweep) cancelAnimationFrame(rafSweep);
      if (REDUCED) { t = 1; draw(); return; }
      t = 0;
      const DURATION = 1500;
      let start = null;
      function frame(ts) {
        if (start == null) start = ts;
        t = Math.min(1, (ts - start) / DURATION);
        draw();
        if (t < 1) rafSweep = requestAnimationFrame(frame);
      }
      rafSweep = requestAnimationFrame(frame);
    }

    // count verdicts for the current scenario (shared by badge + caption)
    function tally() {
      const c = { ontime: 0, shifted: 0, twice: 0, gap: 0 };
      scenarios[sIdx].cities.forEach((cv) => (c[cv.verdict] = (c[cv.verdict] || 0) + 1));
      return c;
    }

    // ---- corner verdict badge ------------------------------------------
    function setBadge() {
      const sc = scenarios[sIdx], c = tally();
      let line;
      if (sc.key === "normal") {
        line = `<b>${c.ontime}</b> sends · all on time`;
      } else {
        const bits = [];
        if (c.shifted) bits.push(`<b class="tz-bad">${c.shifted}</b> shifted`);
        if (c.twice) bits.push(`<b class="tz-bad">${c.twice}</b> fired twice`);
        if (c.gap) bits.push(`<b class="tz-bad">${c.gap}</b> never fired`);
        line = bits.join(" · ") || `<b>${c.ontime}</b> on time`;
      }
      badgeVerdict.innerHTML = line;
    }

    // ---- captions -------------------------------------------------------
    function setCaption() {
      const sc = scenarios[sIdx];
      cap.innerHTML = sc.blurb +
        (sc.key === "normal" ? "" :
          " The data you stored never changed... the world did.");
    }

    // ---- wiring ---------------------------------------------------------
    seg.querySelectorAll("[data-s]").forEach((b) =>
      b.addEventListener("click", () => {
        sIdx = +b.dataset.s;
        seg.querySelectorAll("[data-s]").forEach((x) =>
          x.setAttribute("aria-pressed", String(+x.dataset.s === sIdx)));
        setBadge();
        setCaption();
        runSweep();
      }));
    metaField.querySelector(".tz-replay").addEventListener("click", runSweep);

    // hover: name the city + its send time(s) under the cursor (coalesced to one
    // update per frame so a fast drag across rows doesn't thrash layout)
    const onHover = rafThrottle((clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const my = clientY - rect.top;
      const i = Math.floor((my - padT) / rowH);
      if (i < 0 || i >= cities.length) { tip.dataset.show = "0"; return; }
      const cv = scenarios[sIdx].cities[i];
      const meta = byId[cv.id];
      let detail;
      if (cv.verdict === "gap") detail = "9:00 local doesn’t exist today";
      else if (cv.verdict === "twice") detail = "fires twice · " + cv.offsets.map(fmtClock).join(" and ") + " UTC";
      else if (cv.verdict === "shifted") detail = "shifted · now " + fmtClock(cv.offsets[0]) + " UTC";
      else detail = fmtClock(cv.offsets[0]) + " UTC";
      tip.innerHTML = `${meta.city} <small>· ${detail}</small>`;
      // The tip is centered on its x (translate(-50%)); clamp x so it can't run
      // off either edge and get clipped by the stage's overflow:hidden.
      const half = tip.offsetWidth / 2 + 6;
      const cx = Math.max(half, Math.min(W - half, clientX - rect.left));
      tip.style.left = cx + "px";
      tip.style.top = (rowY(i)) + "px";
      tip.dataset.show = "1";
    });
    canvas.addEventListener("mousemove", (e) => onHover(e.clientX, e.clientY));
    canvas.addEventListener("mouseleave", () => (tip.dataset.show = "0"));

    window.addEventListener("resize", rafThrottle(size));
    onThemeChange(draw);

    setBadge();
    setCaption();
    size();
    runSweep();
  }

  // ====================================================================
  //  Figure 2 — "The Clock That Skips and Stutters" (gap + fold)
  //  One US zone's wall-clock day. A vz-seg flips spring-forward vs fall-back.
  //  Spring renders a hatched DEAD BAND where 2:00–3:00 should be (the wall
  //  hour that doesn't exist); fall renders the 1:00–2:00 hour DOUBLED (it
  //  happens twice). The reader drags a job pill along the strip; a floating
  //  status badge narrates the verdict — and dropping it in the gap snaps it
  //  back with a shake, because that instant cannot exist. All slot verdicts
  //  are baked (timezones.json `clock`); the browser does no tz math.
  // ====================================================================
  function buildClock(node, d) {
    const data = d.clock;
    if (!data) { node.innerHTML = '<p class="vz-caption">Couldn’t load the clock data.</p>'; return; }
    const modes = data.modes;
    let mIdx = 0;                          // 0 = spring, 1 = fall
    let jobMin = modes[0].job_min;         // wall-clock minute of the dragged job
    let dragging = false;

    const DAY = 24 * 60;
    const mode = () => modes[mIdx];
    const slotAt = (min) => {
      const s = mode().slots;
      const i = Math.min(s.length - 1, Math.max(0, Math.floor(min / data.slot_min)));
      return s[i];
    };

    node.appendChild(el("span", "vz-figure-title",
      "one clock, one day · the hour that vanishes, and the hour that repeats"));

    const stage = el("div", "tz-stage tz-clock-stage");
    const canvas = el("canvas", "tz-canvas");
    stage.appendChild(canvas);
    // The verdict lives ON the viz, in the BOTTOM-RIGHT corner — the strip's
    // content (track + draggable pill) leaves that corner clear, and it's the
    // single place the outcome is stated (no duplicate UTC row in the canvas,
    // no flow block below). Colour rail comes from .lx-status's is-good/is-bad.
    const status = el("div", "lx-status tz-clock-status",
      '<span class="lx-status-text"></span>');
    stage.appendChild(status);
    node.appendChild(stage);
    const statusText = status.querySelector(".lx-status-text");

    const controls = el("div", "vz-controls");
    const seg = el("div", "vz-field");
    seg.innerHTML =
      '<span class="vz-field-label">The transition</span>' +
      '<div class="vz-seg tz-clock-seg" role="group" aria-label="DST transition">' +
      modes.map((m, i) =>
        `<button data-m="${i}" aria-pressed="${i === 0}">${m.label}</button>`).join("") +
      "</div>";
    controls.appendChild(seg);
    node.appendChild(controls);

    const cap = el("p", "vz-caption");
    node.appendChild(cap);

    // ---- sizing --------------------------------------------------------
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    const padL = 16, padR = 16, padT = 44, padB = 30;
    let trackY = 0;
    function size() {
      const rect = stage.getBoundingClientRect();
      W = Math.max(300, rect.width);
      // Layout, top to bottom: job pill · hour-tick labels · the track · (in
      // fall-back, the doubled-hour band stacked just beneath) · the region
      // annotation. The bottom-right verdict badge floats over the band beneath
      // the track, clear of the annotation (which is left-anchored). Height is
      // just enough to hold the tallest case (fall-back's two stacked bands +
      // its label) so there's no dead gap under the shorter spring view.
      H = 132;
      sizeCanvas(canvas, W, H);
      trackY = padT + 6;
      draw();
    }
    const plotW = () => W - padL - padR;
    const mx = (min) => padL + (min / DAY) * plotW();          // wall-minute -> x
    const minAt = (x) => Math.round(((x - padL) / plotW()) * DAY);

    // ---- draw ----------------------------------------------------------
    function draw() {
      if (!W) return;
      const m = mode();
      const text = cssVar("--text", "#111");
      const soft = cssVar("--text-soft", "#6a6a6a");
      const border = cssVar("--border", "#d0d0d0");
      const brand = cssVar("--brand", "#1b69d1");
      const bad = cssVar("--viz-down", "#d1495b");
      const stripe = cssVar("--table-stripe", "#f4f4f4");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(DPR, DPR);

      const trackH = 26;
      // base track
      ctx.fillStyle = stripe;
      roundRect(ctx, padL, trackY, plotW(), trackH, 6); ctx.fill();

      // hour ticks + labels (every 3h)
      ctx.font = "10px " + cssVar("--mono", "monospace");
      ctx.fillStyle = soft; ctx.strokeStyle = border;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let h = 0; h <= 24; h += 3) {
        const x = mx(h * 60);
        ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, trackY - 5); ctx.lineTo(x, trackY); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillText(String(h).padStart(2, "0"), x, trackY - 18);
      }

      // the special region (gap = hatched dead band; fold = doubled hour).
      // The descriptive label goes BELOW the band, in the clear space under the
      // track — never above it, where it used to collide with the hour-tick
      // numbers. A short connector tick links the band to its label.
      if (m.special) {
        const [s0, s1] = m.special;
        const x0 = mx(s0), x1 = mx(s1);
        ctx.font = "600 10px " + cssVar("--chrome", "sans-serif");
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        if (m.special_kind === "gap") {
          // hatched dead band washed in --viz-down — "this hour doesn't exist"
          ctx.save();
          roundRect(ctx, x0, trackY, x1 - x0, trackH, 0); ctx.clip();
          ctx.fillStyle = withAlpha(bad, 0.10);
          ctx.fillRect(x0, trackY, x1 - x0, trackH);
          ctx.strokeStyle = withAlpha(bad, 0.5); ctx.lineWidth = 1;
          for (let x = x0 - trackH; x < x1; x += 7) {
            ctx.beginPath(); ctx.moveTo(x, trackY + trackH); ctx.lineTo(x + trackH, trackY); ctx.stroke();
          }
          ctx.restore();
          ctx.strokeStyle = bad; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
          ctx.strokeRect(x0, trackY, x1 - x0, trackH); ctx.setLineDash([]);
          // label beneath the band, left-anchored to the band and clamped
          const ly = trackY + trackH + 16;
          ctx.fillStyle = bad;
          ctx.fillText("2:00 → 3:00 · doesn’t exist", Math.max(padL, x0), ly);
        } else {
          // doubled hour: a second copy of 1:00–2:00 stacked just below
          ctx.fillStyle = withAlpha(bad, 0.14);
          roundRect(ctx, x0, trackY, x1 - x0, trackH, 4); ctx.fill();
          roundRect(ctx, x0, trackY + trackH + 4, x1 - x0, trackH, 4); ctx.fill();
          ctx.strokeStyle = withAlpha(bad, 0.55); ctx.lineWidth = 1;
          roundRect(ctx, x0, trackY + trackH + 4, x1 - x0, trackH, 4); ctx.stroke();
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = withAlpha(bad, 0.85);
          ctx.font = "9px " + cssVar("--mono", "monospace");
          ctx.fillText("2nd", (x0 + x1) / 2, trackY + trackH + 4 + trackH / 2);
          // label beneath both stacked bands, left-anchored and clamped
          const ly = trackY + trackH + 4 + trackH + 14;
          ctx.font = "600 10px " + cssVar("--chrome", "sans-serif");
          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = bad;
          ctx.fillText("1:00 → 2:00 · happens twice", Math.max(padL, x0), ly);
        }
      }

      // the job pill (draggable marker)
      const slot = slotAt(jobMin);
      const px = mx(jobMin);
      const verdict = slot.kind;                 // normal | gap | fold
      const col = verdict === "normal" ? brand : bad;
      // stem
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, trackY - 2); ctx.lineTo(px, trackY + trackH + 2); ctx.stroke();
      // pill above the track
      const label = "job @ " + wallLabel(jobMin);
      ctx.font = "600 11px " + cssVar("--chrome", "sans-serif");
      const pw = ctx.measureText(label).width + 18;
      const pillY = trackY - 40, pillH = 20;
      ctx.fillStyle = col;
      roundRect(ctx, px - pw / 2, pillY, pw, pillH, 5); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, px, pillY + pillH / 2 + 0.5);
      // (The UTC outcome is narrated by the bottom-right badge, not drawn here —
      //  one verdict location, no duplicate row.)
      ctx.restore();
    }

    function wallLabel(min) {
      let h = Math.floor(min / 60), m = min % 60;
      const ap = h < 12 ? "am" : "pm";
      let hh = h % 12; if (hh === 0) hh = 12;
      return `${hh}:${String(m).padStart(2, "0")}${ap}`;
    }

    // ---- on-viz verdict badge (bottom-right) ---------------------------
    // Terse, like a status readout: a label line + the UTC outcome. This is the
    // ONLY place the outcome is stated.
    function setStatus() {
      const slot = slotAt(jobMin), tone = slot.kind === "normal" ? "good" : "bad";
      status.classList.remove("is-good", "is-bad", "is-info");
      status.classList.add("is-" + tone, "is-shown");
      let verdict;
      if (slot.kind === "gap") {
        verdict = `Never fires; ${wallLabel(jobMin)} doesn’t exist today`;
        statusText.innerHTML =
          `<b class="tz-bad">Never fires</b><span class="tz-status-sub">${wallLabel(jobMin)} doesn’t exist today</span>`;
      } else if (slot.kind === "fold") {
        verdict = `Fires twice, at ${slot.utc[0]}Z and ${slot.utc[1]}Z`;
        statusText.innerHTML =
          `<b class="tz-bad">Fires twice</b><span class="tz-status-sub">${slot.utc[0]}Z &amp; ${slot.utc[1]}Z</span>`;
      } else {
        verdict = `Fires once, at ${slot.utc[0]}Z`;
        statusText.innerHTML =
          `<b>Fires once</b><span class="tz-status-sub">${slot.utc[0]}Z</span>`;
      }
      canvas.setAttribute("aria-valuenow", String(jobMin));
      canvas.setAttribute("aria-valuetext", `${wallLabel(jobMin)} local: ${verdict}`);
    }
    function setCaption() {
      cap.innerHTML = mIdx === 0
        ? `Spring forward: the clock jumps straight from 2:00 to 3:00, so the hatched hour <b>doesn’t exist</b>. Drag the job into it... it can’t land, because there’s no instant to fire at.`
        : `Fall back: the clock rewinds 2:00 to 1:00, so the 1-o’clock hour <b>runs twice</b>. Drag the job into it and a single daily job <b>fires on both passes</b>.`;
    }

    // ---- drag + keyboard ----------------------------------------------
    function commitDrag(x) {
      // clamp to the same ceiling the keyboard + aria use (a job fills a slot)
      jobMin = Math.max(0, Math.min(DAY - data.slot_min, minAt(x)));
      draw(); setStatus();
    }
    function release() {
      if (!dragging) return;
      dragging = false;
      // if dropped in the gap, snap to the nearest valid slot with a shake
      if (slotAt(jobMin).kind === "gap" && mode().special) {
        jobMin = mode().special[0] - data.slot_min;   // just before the dead band
        if (jobMin < 0) jobMin = mode().special[1];
        status.classList.remove("is-shake"); void status.offsetWidth;
        if (!REDUCED) status.classList.add("is-shake");
        draw(); setStatus();
      }
    }
    // Coalesce drag redraws to one per frame.
    const dragTo = rafThrottle((x) => commitDrag(x));
    // Window-level move/up are attached only for the duration of a drag, so
    // there's no always-on global handler and nothing to leak afterward.
    const onMove = (e) => { if (dragging) dragTo(e.clientX - canvas.getBoundingClientRect().left); };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      release();
    };
    canvas.addEventListener("mousedown", (e) => {
      dragging = true;
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      commitDrag(e.clientX - canvas.getBoundingClientRect().left);
    });
    // touch
    canvas.addEventListener("touchstart", (e) => {
      dragging = true; commitDrag(e.touches[0].clientX - canvas.getBoundingClientRect().left);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      if (dragging) { commitDrag(e.touches[0].clientX - canvas.getBoundingClientRect().left); e.preventDefault(); }
    }, { passive: false });
    canvas.addEventListener("touchend", release);
    // keyboard a11y: arrows nudge the job by one slot
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "slider");
    canvas.setAttribute("aria-label", "Job's wall-clock time");
    canvas.setAttribute("aria-valuemin", "0");
    canvas.setAttribute("aria-valuemax", String(DAY - data.slot_min));
    canvas.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        jobMin = Math.max(0, Math.min(DAY - data.slot_min,
          jobMin + (e.key === "ArrowRight" ? data.slot_min : -data.slot_min)));
        draw(); setStatus();
      }
    });

    seg.querySelectorAll("[data-m]").forEach((b) =>
      b.addEventListener("click", () => {
        mIdx = +b.dataset.m;
        seg.querySelectorAll("[data-m]").forEach((x) =>
          x.setAttribute("aria-pressed", String(+x.dataset.m === mIdx)));
        jobMin = mode().job_min;
        setCaption(); draw(); setStatus();
      }));

    window.addEventListener("resize", rafThrottle(size));
    onThemeChange(draw);

    setCaption();
    size();
    setStatus();
  }

  nodes.forEach((node) => {
    const src = node.dataset.src || "timezones.json";
    whenVisible(node, () => load(src).then((d) => build(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the time-zone data.</p>'; console.error(e); }));
  });
  clocks.forEach((node) => {
    const src = node.dataset.src || "timezones.json";
    whenVisible(node, () => load(src).then((d) => buildClock(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the clock data.</p>'; console.error(e); }));
  });
})();
