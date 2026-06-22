/* Regression figures — "Regression to the Mean" post.
 *
 *   <div class="rg rg-variance" data-src=".../regression.json"></div>
 *
 * "variance": surviving category spread (% of the starting spread) vs quarter,
 * one curve for human pace, one for AI pace. Same loop, same destination; only
 * the clock changes. The 3-years-to-1 claim, drawn. A slider sets the
 * convergence pressure ("defensible calls per quarter").
 *
 * Everything is precomputed in Python (build_regression.py / regression.json):
 * the variance decay series per pressure step at both paces. The browser does
 * ZERO of the modeling math; it swaps and interpolates baked numbers, the same
 * way the coastline / timezone / constellation / locks figures do. Plain
 * canvas, colors from the shared --viz-* / theme tokens (dark/light automatic),
 * controls reuse the shared vz-* design system, paints on scroll into view,
 * respects prefers-reduced-motion.
 */
(function () {
  const varNodes = [...document.querySelectorAll(".rg-variance[data-src]")];
  if (!varNodes.length) return;

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
  function onThemeChange(cb) {
    if (window.matchMedia)
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", cb);
  }
  function rafThrottle(fn) {
    let queued = false, lastArgs;
    return (...args) => {
      lastArgs = args;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
    };
  }
  function pct(v) { return Math.round(v * 100); }

  function buildVariance(node, d) {
    if (!d.steps) { node.innerHTML = '<p class="vz-caption">Couldn’t load the data.</p>'; return; }
    const NQ = d.meta.nQuarters;
    let stepIdx = d.meta.defaultStep | 0;
    let reveal = 0;

    node.appendChild(el("span", "vz-figure-title",
      "surviving spread over time · human pace vs AI pace"));

    const stage = el("div", "rg-stage rg-var-stage");
    const canvas = el("canvas", "rg-canvas");
    canvas.setAttribute("role", "img");
    stage.appendChild(canvas);
    node.appendChild(stage);

    const controls = el("div", "vz-controls");
    const pField = el("div", "vz-field");
    pField.innerHTML =
      '<span class="vz-field-label">Defensible calls / quarter</span>' +
      '<div class="vz-slider-wrap">' +
      '<span class="rg-slider-end">few</span>' +
      `<input class="vz-slider rg-p-slider" type="range" min="0" max="${d.steps.length - 1}" step="1" value="${stepIdx}" aria-label="Convergence pressure">` +
      '<span class="rg-slider-end">many</span>' +
      '</div>';
    controls.appendChild(pField);
    node.appendChild(controls);

    const cap = el("p", "vz-caption");
    node.appendChild(cap);
    const pSlider = pField.querySelector(".rg-p-slider");

    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    const padL = 44, padR = 16, padT = 16, padB = 38;

    function size() {
      const rect = stage.getBoundingClientRect();
      W = Math.max(300, rect.width);
      H = Math.round(Math.max(230, Math.min(320, W * 0.56)));
      sizeCanvas(canvas, W, H);
      draw();
    }
    function px(q) {
      const plotW = W - padL - padR;
      return padL + (q / NQ) * plotW;
    }
    function py(v) {
      const plotH = H - padT - padB;
      return padT + plotH * (1 - v);     // v is 0..1 (share of starting spread)
    }

    function curve(ctx2, series, upto) {
      ctx2.beginPath();
      for (let i = 0; i <= upto; i++) {
        const X = px(i), Y = py(series[i]);
        i ? ctx2.lineTo(X, Y) : ctx2.moveTo(X, Y);
      }
      ctx2.stroke();
    }

    function draw() {
      if (!W) return;
      const dark = isDark();
      const soft = cssVar("--text-soft", "#6a6a6a");
      const border = cssVar("--border", dark ? "#3a3a3f" : "#d0d0d0");
      const humanCol = cssVar("--viz-cat-1", "#1b69d1");
      const aiCol = cssVar("--viz-chain", "#e0823d");
      const step = d.steps[stepIdx];
      const upto = Math.max(1, Math.round(NQ * reveal));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(DPR, DPR);

      // axes
      ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.lineTo(W - padR, H - padB);
      ctx.stroke();

      // year gridlines (every 4 quarters) + labels
      ctx.font = "11px " + cssVar("--chrome", "sans-serif");
      ctx.fillStyle = soft; ctx.textBaseline = "top";
      ctx.setLineDash([2, 4]);
      for (let yr = 1; yr * 4 <= NQ; yr++) {
        const X = px(yr * 4);
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, H - padB); ctx.stroke();
        ctx.globalAlpha = 1;
        // The final year sits on the right edge; right-align its label so it
        // tucks inside the plot instead of clipping past the canvas.
        ctx.textAlign = yr * 4 === NQ ? "right" : "center";
        ctx.fillText(`year ${yr}`, X, H - padB + 8);
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // y label
      ctx.save();
      ctx.translate(13, (padT + H - padB) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      ctx.fillText("spread left  →", 0, 0);
      ctx.restore();

      // human curve
      ctx.strokeStyle = humanCol; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
      curve(ctx, step.human.spread, upto);
      // AI curve
      ctx.strokeStyle = aiCol; ctx.lineWidth = 2.5;
      curve(ctx, step.ai.spread, upto);

      // endpoints + inline labels once fully revealed. Both labels sit to the
      // LEFT of the final point and ABOVE their curve, so neither collides with
      // the "year 3" tick that lives just below the x-axis at the right edge.
      if (reveal >= 0.999) {
        const hEnd = step.human.spread[NQ], aEnd = step.ai.spread[NQ];
        ctx.fillStyle = humanCol;
        ctx.beginPath(); ctx.arc(px(NQ), py(hEnd), 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = aiCol;
        ctx.beginPath(); ctx.arc(px(NQ), py(aEnd), 4, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillStyle = humanCol;
        ctx.fillText("human", px(NQ) - 8, py(hEnd) - 6);
        ctx.fillStyle = aiCol;
        ctx.fillText("with AI", px(NQ) - 8, py(aEnd) - 6);
      }

      ctx.restore();
    }

    function animateReveal() {
      reveal = 1; draw();
      if (REDUCED) return;
      reveal = 0;
      const dur = 760;
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

    // Shared stats for the current pressure step: where the human curve lands
    // after three years, and the quarter the AI curve first reaches that level.
    function stats() {
      const step = d.steps[stepIdx];
      const hEnd = step.human.spread[NQ];
      let aiQ = NQ;
      for (let i = 0; i <= NQ; i++) {
        if (step.ai.spread[i] <= hEnd) { aiQ = i; break; }
      }
      const aiYrs = aiQ / 4;
      const yrsStr = (aiYrs % 1 === 0 ? aiYrs : aiYrs.toFixed(2)) +
        " year" + (aiYrs === 1 ? "" : "s");
      return { hEnd, aiYrs, yrsStr };
    }

    function setCaption() {
      const { hEnd, yrsStr } = stats();
      cap.innerHTML =
        `Same loop, two speeds. Human pace lands at <b>${pct(hEnd)}%</b> spread after ` +
        `three years. AI pace hits that same flatness by <b>${yrsStr}</b>. ` +
        "We didn't change where the category ends up. We removed the bottleneck on getting there.";
    }

    // Keep the canvas description and the slider value in sync with the data, so
    // a screen reader hears the actual numbers rather than a stale sentence or a
    // bare 0..5 index. Mirrors the coastline figure's aria-valuetext pattern.
    function setAria() {
      const { hEnd, yrsStr } = stats();
      canvas.setAttribute("aria-label",
        `Line chart of surviving category spread over twelve quarters, two curves ` +
        `falling toward zero. At the current setting, human pace lands at ${pct(hEnd)} ` +
        `percent spread after three years; AI pace reaches that same flatness by ${yrsStr}.`);
      pSlider.setAttribute("aria-valuetext",
        `${stepIdx + 1} of ${d.steps.length}: AI flattens the category by ${yrsStr}`);
    }

    pSlider.addEventListener("input", () => {
      stepIdx = +pSlider.value;
      setCaption();
      setAria();
      // The reveal animation is a one-time entrance flourish; on slider input we
      // just redraw the new curves in place (no re-animation flicker).
      reveal = 1;
      draw();
    });

    window.addEventListener("resize", rafThrottle(size));
    onThemeChange(draw);

    setCaption();
    setAria();
    size();
    animateReveal();
  }

  // ---- mount ----------------------------------------------------------
  varNodes.forEach((node) => {
    const src = node.dataset.src;
    whenVisible(node, () => load(src).then((d) => buildVariance(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the data.</p>'; console.error(e); }));
  });
})();
