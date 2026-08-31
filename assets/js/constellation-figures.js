/* Constellation figures — three focused interactives, one per method, plus the
 * data-cleaning bar. Replaces the old single kitchen-sink explorer + the static
 * panels: now every method gets exactly the one control that tells its story.
 *
 *   <div class="cx-fig" data-fig="naive"  data-src="stars.json"></div>
 *   <div class="cx-fig" data-fig="sphere" data-src="stars.json"></div>
 *   <div class="cx-fig" data-fig="chain"  data-src="stars.json"></div>
 *   <div class="cx-clean" data-src="stars.json"></div>
 *
 * naive  -> flat (RA, dec); toggle "set aside the wrapping constellations" to
 *           act out the 2016 shortcut, dashed seam always shown.
 * sphere -> healed whole sky; switch coloring real <-> algorithm (the method
 *           only matters under "algorithm", so it lives nested there).
 * chain  -> bright-star linkage; magnitude slider + live score + constellation
 *           search, nearest-neighbor chains drawn.
 *
 * All clustering is precomputed in Python (stars.json); the browser only swaps
 * precomputed labelings, so every interaction is instant. Plain canvas, colors
 * read from CSS custom properties so dark/light mode is automatic. Each figure
 * paints only once it scrolls into view.
 */
(function () {
  const figs = [...document.querySelectorAll(".cx-fig[data-fig]")];
  const cleans = [...document.querySelectorAll(".cx-clean[data-src]")];
  if (!figs.length && !cleans.length) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const FULL = window.CX_CON_NAMES || {};

  // One fetch per unique source, shared across every figure on the page.
  const cache = {};
  function load(src) {
    if (!cache[src]) cache[src] = fetch(src).then((r) => r.json());
    return cache[src];
  }
  function isDark() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function cssVar(n, f) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  }
  function hue(i) { return (i * 137.508) % 360; }
  function catColor(i, dark, a) {
    return `hsla(${hue(i).toFixed(1)} ${dark ? 68 : 64}% ${dark ? 63 : 47}% / ${a == null ? 1 : a})`;
  }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function whenVisible(node, cb) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { cb(); io.disconnect(); } });
    }, { threshold: 0.2 });
    io.observe(node);
  }

  // Constellations whose stars straddle the RA 0/24h seam — the ones 2016-me
  // set aside. Computed from the data, not hardcoded.
  function wrappingConstellations(d) {
    const lo = {}, hi = {};
    for (let i = 0; i < d.ra.length; i++) {
      const c = d.con[i];
      if (d.ra[i] < 3) lo[c] = true;
      if (d.ra[i] > 21) hi[c] = true;
    }
    const set = {};
    for (const c in lo) if (hi[c]) set[c] = true;
    return set; // { conId: true }
  }

  // ---- data-cleaning bar -------------------------------------------------
  function buildClean(node, d) {
    const c = d.cleaning;
    const rows = [
      { label: "In the catalog", val: c.total, cls: "is-all" },
      { label: "Naked-eye (mag ≤ 6)", val: c.naked_eye, cls: "is-eye" },
    ];
    const max = c.total;

    const tag = el("span", "vz-figure-title");
    tag.textContent = "the data · how little of the sky is naked-eye visible";
    node.appendChild(tag);

    const frame = el("div", "cx-clean-frame");
    const wrap = el("div", "cx-clean-inner");
    rows.forEach((r) => {
      const row = el("div", "cx-clean-row");
      row.innerHTML =
        `<span class="cx-clean-label">${r.label}</span>` +
        `<span class="cx-clean-track"><span class="cx-clean-fill ${r.cls}"></span></span>` +
        `<span class="cx-clean-num">${r.val.toLocaleString()}</span>`;
      wrap.appendChild(row);
      requestAnimationFrame(() => {
        row.querySelector(".cx-clean-fill").style.width =
          Math.max(1.2, (r.val / max) * 100) + "%";
      });
    });
    frame.appendChild(wrap);
    node.appendChild(frame);
    const cap = el("p", "vz-caption");
    const pct = ((c.naked_eye / c.total) * 100).toFixed(1);
    cap.textContent =
      `The HYG catalog lists ${c.total.toLocaleString()} stars. Only ` +
      `${c.naked_eye.toLocaleString()} (~${pct}%) are bright enough to ` +
      `see with the naked eye (magnitude ≤ +6). Those are the only stars anyone ` +
      `could have drawn a constellation from, so they're the only ones we keep.`;
    node.appendChild(cap);
  }

  // ---- shared sky-figure scaffold ----------------------------------------
  // Builds the tag + stage(canvas + optional score + tip) + caption, plus a
  // controls row the caller fills. Returns the pieces and a draw-scheduler.
  function makeSky(node, opts) {
    const tag = el("span", "vz-figure-title");
    tag.textContent = opts.tag;
    node.appendChild(tag);

    const stage = el("div", "cx-stage");
    const canvas = el("canvas", "cx-canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label",
      opts.ariaLabel || `Sky map of clustered stars (${opts.tag}); the reproducibility score and caption below summarize the result.`);
    stage.appendChild(canvas);
    let scoreEl, scoreNum, scoreSub, scoreArrow, tip;
    if (opts.score) {
      scoreEl = el("div", "cx-score");
      scoreEl.innerHTML =
        '<p class="cx-score-label">Reproducibility (NMI)</p>' +
        '<div class="cx-score-val"><span class="cx-score-num">0.00</span>' +
        '<span class="cx-arrow"></span></div><p class="cx-score-sub"></p>';
      stage.appendChild(scoreEl);
      scoreNum = scoreEl.querySelector(".cx-score-num");
      scoreSub = scoreEl.querySelector(".cx-score-sub");
      scoreArrow = scoreEl.querySelector(".cx-arrow");
    }
    if (opts.tip) { tip = el("div", "cx-tip"); stage.appendChild(tip); }
    node.appendChild(stage);

    const controls = el("div", "vz-controls");
    node.appendChild(controls);

    const cap = el("p", "vz-caption");
    node.appendChild(cap);

    const ctx = canvas.getContext("2d");
    const aspect = opts.aspect || 0.5;
    let W = 0, H = 0;
    function size() {
      const rect = stage.getBoundingClientRect();
      W = Math.max(300, rect.width);
      H = Math.round(W * aspect);
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      opts.onsize && opts.onsize(W, H);
      draw();
    }
    let raf = null;
    function requestDraw() { if (!raf) raf = requestAnimationFrame(() => { raf = null; draw(); }); }
    function draw() { opts.draw(ctx, W, H); }

    window.addEventListener("resize", size);
    if (window.matchMedia)
      window.matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => { opts.ontheme && opts.ontheme(); requestDraw(); });

    return { canvas, ctx, controls, cap, scoreEl, scoreNum, scoreSub, scoreArrow, tip,
             size, draw, requestDraw, getW: () => W, getH: () => H };
  }

  function project(W, H, ra, dec) {
    return [W * (1 - ra / 24), H * (1 - (dec + 90) / 180)];
  }
  function magRadius(mag) {
    return Math.max(0.55, 0.5 + Math.pow(Math.max(0, 6.6 - mag), 1.15) * 0.33) * DPR;
  }
  function drawGrid(ctx, W, H, dark) {
    ctx.strokeStyle = cssVar("--border", dark ? "#3a3a3f" : "#d0d0d0");
    ctx.globalAlpha = 0.28; ctx.lineWidth = DPR;
    for (let h = 0; h <= 24; h += 6) { const [x] = project(W, H, h, 0);
      ctx.beginPath(); ctx.moveTo(x * DPR, 0); ctx.lineTo(x * DPR, ctx.canvas.height); ctx.stroke(); }
    for (let dd = -60; dd <= 60; dd += 30) { const [, y] = project(W, H, 0, dd);
      ctx.beginPath(); ctx.moveTo(0, y * DPR); ctx.lineTo(ctx.canvas.width, y * DPR); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // ---- figure 1: naive (flat) --------------------------------------------
  function buildNaive(node, d) {
    const wrap = wrappingConstellations(d);
    const wrapIds = Object.keys(wrap).map(Number);
    let setAside = false; // start showing everything, so the tear is visible
    let conColors = [];
    function rebuildColors() {
      conColors = d.constellations.map((_, i) => catColor(i, isDark()));
    }
    rebuildColors();

    const sky = makeSky(node, {
      tag: "method 1 · flat k-means on (RA, dec)",
      tip: true,
      ontheme: rebuildColors,
      draw: (ctx, W, H) => {
        const dark = isDark();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawGrid(ctx, W, H, dark);
        // seam: dashed lines at RA 0 and 24
        ctx.strokeStyle = cssVar("--viz-down", "#d1495b");
        ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5 * DPR;
        ctx.setLineDash([6 * DPR, 5 * DPR]);
        [project(W, H, 24, 0)[0], project(W, H, 0, 0)[0]].forEach((x) => {
          ctx.beginPath(); ctx.moveTo(x * DPR, 0); ctx.lineTo(x * DPR, ctx.canvas.height); ctx.stroke();
        });
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        // stars colored by true constellation; wrappers fade out when set aside
        for (let i = 0; i < d.ra.length; i++) {
          const isWrap = wrap[d.con[i]];
          const a = isWrap && setAside ? 0.07 : 1;
          const [x, y] = project(W, H, d.ra[i], d.dec[i]);
          ctx.globalAlpha = a;
          ctx.fillStyle = isWrap && setAside
            ? "hsla(0 0% 50% / 0.5)" : conColors[d.con[i]];
          ctx.beginPath(); ctx.arc(x * DPR, y * DPR, magRadius(d.mag[i]), 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });

    // control: the 2016 shortcut toggle
    sky.controls.innerHTML = `
      <div class="vz-field">
        <span class="vz-field-label">The 2016 shortcut</span>
        <label class="vz-toggle">
          <input type="checkbox" class="cx-aside" /> Set aside the wrapping constellations
        </label>
      </div>`;
    function setCaption() {
      const names = wrapIds.map((id) => FULL[d.constellations[id]] || d.constellations[id]).sort();
      sky.cap.innerHTML = setAside
        ? `Set aside: the <b>${wrapIds.length}</b> constellations that straddle the ` +
          `seam (${names.join(", ")}) are greyed out and dropped from the analysis`
        : `Right ascension wraps at 24h = 0h, but a flat map doesn't: stars either ` +
          `side of that seam (dashed) look maximally far apart, so flat k-means tears ` +
          `any constellation crossing it. <b>${wrapIds.length}</b> of them do.`;
    }
    sky.controls.querySelector(".cx-aside").addEventListener("change", (e) => {
      setAside = e.target.checked; setCaption(); sky.requestDraw();
    });
    // hover tooltip
    sky.canvas.addEventListener("mousemove", (e) => {
      const rect = sky.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const W = sky.getW(), H = sky.getH();
      let best = -1, bd = 12 * 12;
      for (let i = 0; i < d.ra.length; i++) {
        if (wrap[d.con[i]] && setAside) continue;
        const [x, y] = project(W, H, d.ra[i], d.dec[i]);
        const dx = x - mx, dy = y - my, dist = dx * dx + dy * dy;
        if (dist < bd) { bd = dist; best = i; }
      }
      if (best >= 0) {
        const con = d.constellations[d.con[best]];
        sky.tip.innerHTML = `${d.name[best] || "(unnamed star)"} <small>· ${FULL[con] || con} · mag ${d.mag[best].toFixed(1)}</small>`;
        sky.tip.style.left = mx + "px"; sky.tip.style.top = my + "px";
        sky.tip.dataset.show = "1";
      } else sky.tip.dataset.show = "0";
    });
    sky.canvas.addEventListener("mouseleave", () => (sky.tip.dataset.show = "0"));

    setCaption();
    sky.size();
  }

  // ---- figure 2: sphere (healed) -----------------------------------------
  // Color mode is the top-level control: real constellations vs the algorithm's
  // groups. Nested under "the algorithm's groups" is the clustering method —
  // the recreated 2016 pipeline (flat k-means with the seam-wrapping
  // constellations deleted, scored on the survivors, exactly as the paper did)
  // vs sphere k-means on all 88. That's the honest before/after: same flat
  // geometry the paper used, against the spherical fix. (Linkage lives in
  // figure 3 with its bright-star cut.)
  function buildSphere(node, d) {
    const step = 0; // all naked-eye stars
    // Recreated 2016 pipeline block (flat RA/dec + dropped seam constellations).
    const naive2016 = d.naive2016 || d.naive2017;
    if (!naive2016) {
      console.error("stars.json is missing naive2016 (recreated 2016 pipeline labels)");
    }
    let view = "con"; // "con" | "cluster"
    let method = "sphere"; // "naive" | "sphere" — nested under the cluster view
    let hoverGroup = -1; // group under the cursor (real con OR cluster); -1 = none
    let conColors = [], clusterColors = [];
    // Flat k-means here is the *recreated 2016 pipeline*: the seam-wrapping
    // constellations were deleted (label -1), and only the survivors were
    // clustered and scored — exactly what the paper did. Sphere k-means keeps
    // all 88. So "flat" reads a different label source than the per-step arrays.
    function activeLabs() {
      return method === "naive" ? naive2016.labels : d.labels[method][step];
    }
    // The group a star belongs to *in the current view* — so hover isolates
    // whatever is being colored: the real constellation, or the algorithm's
    // cluster. Stars deleted by the 2016 pipeline (-1) belong to no group.
    function groupOf(i) {
      if (view === "con") return d.con[i];
      const l = activeLabs()[i];
      return l < 0 ? -1 : l;
    }
    function rebuildColors() {
      const dark = isDark();
      conColors = d.constellations.map((_, i) => catColor(i, dark));
      const labs = activeLabs();
      const maxc = labs.reduce((m, v) => Math.max(m, v), 0) + 1;
      clusterColors = Array.from({ length: Math.max(1, maxc) }, (_, i) => catColor(i, dark));
    }
    // Greyed-out fill for stars the 2016 pipeline deleted (flat method only).
    function deletedColor() { return isDark() ? "hsla(0 0% 55% / 0.45)" : "hsla(0 0% 45% / 0.4)"; }
    rebuildColors();

    const sky = makeSky(node, {
      tag: "method 2 · k-means on the unit sphere (x, y, z)",
      tip: true, score: true,
      ontheme: rebuildColors,
      draw: (ctx, W, H) => {
        const dark = isDark();
        const labs = activeLabs();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawGrid(ctx, W, H, dark);
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < labs.length; i++) {
            const deleted = view === "cluster" && labs[i] < 0;
            const color = deleted ? deletedColor()
              : view === "con" ? conColors[d.con[i]] : clusterColors[labs[i]];
            const dim = (hoverGroup >= 0 && groupOf(i) !== hoverGroup) || deleted;
            const [x, y] = project(W, H, d.ra[i], d.dec[i]);
            const r = magRadius(d.mag[i]);
            ctx.globalAlpha = deleted ? 0.4 : dim ? 0.12 : 1;
            if (pass === 0) {
              if (d.mag[i] > 3.2 || dim) continue; // no glow on dimmed/deleted stars
              const g = ctx.createRadialGradient(x*DPR, y*DPR, 0, x*DPR, y*DPR, r*3.4);
              g.addColorStop(0, color); g.addColorStop(1, "transparent");
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(x*DPR, y*DPR, r*3.4, 0, 6.2832); ctx.fill();
            } else {
              ctx.fillStyle = color;
              ctx.beginPath(); ctx.arc(x*DPR, y*DPR, r, 0, 6.2832); ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;
      },
    });

    sky.controls.innerHTML = `
      <div class="vz-field">
        <span class="vz-field-label">Color stars by</span>
        <div class="vz-seg" role="group" aria-label="Color stars by">
          <button data-view="con" aria-pressed="true">Real constellations</button>
          <button data-view="cluster" aria-pressed="false">The algorithm's groups</button>
        </div>
      </div>
      <div class="vz-field vz-field-nested" data-nested hidden>
        <span class="vz-field-label">…drawn by</span>
        <div class="vz-seg" role="group" aria-label="Clustering method">
          <button data-method="naive" aria-pressed="false">The 2016 way</button>
          <button data-method="sphere" aria-pressed="true">Sphere k-means</button>
        </div>
      </div>`;
    const nested = sky.controls.querySelector("[data-nested]");
    // Flat reads the recreated-2016 block (deleted subset, its own score);
    // sphere reads the all-88 curve row for this step.
    function methodNmi() { return method === "naive" ? naive2016.nmi : d.curve[step].sphere_nmi; }
    function methodAri() { return method === "naive" ? naive2016.ari : d.curve[step].sphere_ari; }
    function methodK()   { return method === "naive" ? naive2016.k   : d.curve[step].k; }
    function methodN()   { return method === "naive" ? naive2016.n   : d.curve[step].n; }
    function setScore() {
      // The real constellations are the ground truth — there's nothing to score
      // them against (NMI with itself is trivially 1.0), so hide the readout.
      if (view === "con") { sky.scoreEl.hidden = true; return; }
      sky.scoreEl.hidden = false;
      sky.scoreNum.textContent = methodNmi().toFixed(2);
      sky.scoreArrow.textContent = "";
      sky.scoreSub.textContent =
        `ARI ${methodAri().toFixed(2)} · ${methodN().toLocaleString()} stars · k=${methodK()}`;
    }
    function setCaption() {
      if (view === "con") {
        sky.cap.innerHTML =
          `The real constellations on the healed sphere for reference. Flip to <b>the algorithm's ` +
          `groups</b> to see what k-means drew when asked for 88 of its own.`;
      } else if (method === "sphere") {
        sky.cap.innerHTML =
          `Sphere k-means clustered on the 3D unit vectors: all 88 groups, colored ` +
          `independently. It aligns with the real constellations at <b>NMI ` +
          `${d.curve[step].sphere_nmi.toFixed(2)}</b>.`;
      } else {
        const dropped = naive2016.dropped.length;
        sky.cap.innerHTML =
          `How I did things in 2016 with the <b>${dropped}</b> seam-wrapping constellations deleted ` +
          `(greyed out here) and clustered on what's left. The score, <b>NMI ` +
          `${naive2016.nmi.toFixed(2)}</b>, is unfortunately within a hair of the sphere's <b>` +
          `${d.curve[step].sphere_nmi.toFixed(2)}</b>.`;
      }
    }
    sky.controls.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => {
        view = b.dataset.view;
        sky.controls.querySelectorAll("[data-view]").forEach((x) =>
          x.setAttribute("aria-pressed", x.dataset.view === view));
        nested.hidden = view !== "cluster";
        hoverGroup = -1; // group keys differ between con/cluster
        setScore(); setCaption(); sky.requestDraw();
      }));
    sky.controls.querySelectorAll("[data-method]").forEach((b) =>
      b.addEventListener("click", () => {
        method = b.dataset.method;
        sky.controls.querySelectorAll("[data-method]").forEach((x) =>
          x.setAttribute("aria-pressed", x.dataset.method === method));
        rebuildColors();
        hoverGroup = -1; // cluster ids differ between methods
        setScore(); setCaption(); sky.requestDraw();
      }));
    sky.canvas.addEventListener("mousemove", (e) => {
      const rect = sky.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const W = sky.getW(), H = sky.getH();
      let best = -1, bd = 12 * 12;
      for (let i = 0; i < d.ra.length; i++) {
        const [x, y] = project(W, H, d.ra[i], d.dec[i]);
        const dx = x - mx, dy = y - my, dist = dx * dx + dy * dy;
        if (dist < bd) { bd = dist; best = i; }
      }
      const newHover = best >= 0 ? groupOf(best) : -1;
      if (best >= 0) {
        const con = d.constellations[d.con[best]];
        sky.tip.innerHTML = `${d.name[best] || "(unnamed star)"} <small>· ${FULL[con] || con} · mag ${d.mag[best].toFixed(1)}</small>`;
        sky.tip.style.left = mx + "px"; sky.tip.style.top = my + "px";
        sky.tip.dataset.show = "1";
      } else sky.tip.dataset.show = "0";
      if (newHover !== hoverGroup) { hoverGroup = newHover; sky.requestDraw(); }
    });
    sky.canvas.addEventListener("mouseleave", () => {
      sky.tip.dataset.show = "0";
      if (hoverGroup !== -1) { hoverGroup = -1; sky.requestDraw(); }
    });

    setScore(); setCaption(); sky.size();
  }

  // ---- figure 3: chain (bright-star linkage) -----------------------------
  // The payoff figure: magnitude slider drives the cut, score animates, chains
  // are drawn, and the constellation search/spotlight lives here.
  function buildChain(node, d) {
    let step = d.meta.mag_steps.length - 1; // start at the brightest cut (best story)
    let spotlight = -1;
    let conColors = [], clusterCache = {};
    // Unit (x, y, z) directions, same as analyze.py's sphere_vectors: RA hours
    // -> degrees (x15) -> radians. Lets the chains use real angular distance,
    // so the RA seam and the poles behave instead of tearing.
    const xyz = d.ra.map((raH, i) => {
      const ra = raH * 15 * Math.PI / 180, dec = d.dec[i] * Math.PI / 180;
      const cd = Math.cos(dec);
      return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
    });
    // Chordal-distance cutoff for ~25° of arc: chord = 2*sin(theta/2).
    const CHAIN_MAX_CHORD2 = (() => { const c = 2 * Math.sin(25 * Math.PI / 360); return c * c; })();
    function rebuildColors() {
      conColors = d.constellations.map((_, i) => catColor(i, isDark()));
      clusterCache = {};
    }
    function clusterColorsFor(s) {
      const key = s + ":" + isDark();
      if (clusterCache[key]) return clusterCache[key];
      const labs = d.labels.linkage[s];
      const maxc = labs.reduce((m, v) => Math.max(m, v), 0) + 1;
      const arr = Array.from({ length: Math.max(1, maxc) }, (_, i) => catColor(i, isDark()));
      clusterCache[key] = arr; return arr;
    }
    rebuildColors();

    const sky = makeSky(node, {
      tag: "method 3 · average-linkage on the bright stars",
      aspect: 0.5, score: true, tip: true,
      ontheme: rebuildColors,
      draw: (ctx, W, H) => {
        const dark = isDark();
        const labs = d.labels.linkage[step];
        const shown = labs.length;
        const cc = clusterColorsFor(step);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawGrid(ctx, W, H, dark);
        // chains: connect each star to its nearest brighter neighbor in-cluster,
        // by true 3D distance on the unit sphere (the catalog is magnitude-sorted,
        // so j < i means brighter). Squared chord distance is monotonic with the
        // great-circle angle, so this matches the geometry the clustering used.
        ctx.strokeStyle = cssVar("--viz-chain", "#e0823d");
        ctx.globalAlpha = 0.5; ctx.lineWidth = 1.1 * DPR;
        for (let i = 1; i < shown; i++) {
          if (spotlight >= 0 && d.con[i] !== spotlight) continue;
          let nj = -1, nd = Infinity;
          const vi = xyz[i];
          for (let j = 0; j < i; j++) {
            if (labs[j] !== labs[i]) continue;
            const vj = xyz[j];
            const dx = vi[0] - vj[0], dy = vi[1] - vj[1], dz = vi[2] - vj[2];
            const dist = dx * dx + dy * dy + dz * dz;
            if (dist < nd) { nd = dist; nj = j; }
          }
          if (nj >= 0 && nd < CHAIN_MAX_CHORD2) {
            const [x1, y1] = project(W, H, d.ra[i], d.dec[i]);
            const [x2, y2] = project(W, H, d.ra[nj], d.dec[nj]);
            if (Math.abs(d.ra[i] - d.ra[nj]) > 12) {
              // Seam pair: close on the sphere but on opposite edges of this flat
              // map. Draw it wrapping off both edges instead of slashing across.
              const w = W * DPR, left = x1 < x2;
              const near = left ? x1 : x2, ny = left ? y1 : y2; // the smaller-x point
              const far = left ? x2 : x1, fy = left ? y2 : y1;  // the larger-x point
              ctx.beginPath(); ctx.moveTo(near*DPR, ny*DPR); ctx.lineTo(far*DPR - w, fy*DPR); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(far*DPR, fy*DPR); ctx.lineTo(near*DPR + w, ny*DPR); ctx.stroke();
            } else {
              ctx.beginPath(); ctx.moveTo(x1*DPR, y1*DPR); ctx.lineTo(x2*DPR, y2*DPR); ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
        // stars
        for (let i = 0; i < shown; i++) {
          const inSpot = spotlight < 0 || d.con[i] === spotlight;
          const [x, y] = project(W, H, d.ra[i], d.dec[i]);
          ctx.globalAlpha = inSpot ? 1 : 0.12;
          ctx.fillStyle = cc[labs[i]];
          ctx.beginPath(); ctx.arc(x*DPR, y*DPR, magRadius(d.mag[i]), 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });

    sky.controls.innerHTML = `
      <div class="vz-field">
        <span class="vz-field-label">Faintest stars shown</span>
        <div class="vz-slider-wrap">
          <input class="vz-slider" type="range" min="0" max="7" step="1" value="7"
                 aria-label="Magnitude limit" />
          <span class="vz-slider-val"></span>
        </div>
      </div>
      <div class="vz-field">
        <span class="vz-field-label">Find a constellation</span>
        <div class="cx-combo">
          <input class="cx-combo-input" type="text" role="combobox" autocomplete="off"
                 aria-expanded="false" aria-controls="cx-combo-list" aria-autocomplete="list"
                 placeholder="e.g. Orion" />
          <span class="cx-combo-caret" aria-hidden="true">▾</span>
          <ul class="cx-combo-list" id="cx-combo-list" role="listbox" hidden></ul>
        </div>
      </div>`;

    // score animation
    let displayed = d.curve[step].linkage_nmi, rafScore = null;
    function setScore() {
      const c = d.curve[step];
      const target = c.linkage_nmi;
      if (rafScore) cancelAnimationFrame(rafScore);
      if (REDUCED) {                                  // no count-up tween
        displayed = target;
        sky.scoreNum.textContent = target.toFixed(2);
      } else (function anim() {
        const diff = target - displayed;
        if (Math.abs(diff) < 0.0015) displayed = target;
        else { displayed += diff * 0.2; rafScore = requestAnimationFrame(anim); }
        sky.scoreNum.textContent = displayed.toFixed(2);
      })();
      // arrow vs the all-stars (faintest) baseline: brighter cuts climb above it
      const up = target >= d.curve[0].linkage_nmi;
      sky.scoreArrow.textContent = step === 0 ? "" : (up ? "▲" : "▼");
      sky.scoreArrow.className = "cx-arrow " + (up ? "cx-up" : "cx-down");
      sky.scoreSub.textContent = `ARI ${c.linkage_ari.toFixed(2)} · ${c.n.toLocaleString()} stars · k=${c.k}`;
    }
    function setCaption() {
      const mag = d.meta.mag_steps[step];
      const c = d.curve[step];
      let s = `Showing stars down to magnitude +${mag.toFixed(1)} (${c.n.toLocaleString()} of ` +
        `${d.ra.length.toLocaleString()}). Lines chain each star to its nearest in-cluster ` +
        `neighbor. Alignment with the real map: NMI ${c.linkage_nmi.toFixed(2)}.`;
      if (spotlight >= 0) {
        const name = d.constellations[spotlight];
        const rec = d.recovery[name];
        s += `${FULL[name] || name}` + (rec != null ? ` recovered ${Math.round(rec*100)}% intact among the bright stars.` : ".");
      }
      sky.cap.textContent = s;
    }

    const slider = sky.controls.querySelector(".vz-slider");
    const sliderVal = sky.controls.querySelector(".vz-slider-val");
    function syncSlider() {
      sliderVal.innerHTML = `mag ≤ <b>+${d.meta.mag_steps[step].toFixed(1)}</b>`;
    }
    slider.addEventListener("input", () => {
      // mag_steps is [6.0 .. 2.5] (faintest -> brightest). Slider value maps
      // straight to step: left/0 = faintest (all stars), right/7 = brightest.
      step = parseInt(slider.value, 10);
      syncSlider(); setScore(); setCaption(); sky.requestDraw();
    });

    // searchable combobox
    const combo = {
      input: sky.controls.querySelector(".cx-combo-input"),
      list: sky.controls.querySelector(".cx-combo-list"),
      items: d.constellations.map((abbr, id) => ({ id, abbr, full: FULL[abbr] || abbr }))
        .sort((a, b) => a.full.localeCompare(b.full)),
      matches: [], active: -1, open: false,
    };
    function comboFilter(q) {
      q = q.trim().toLowerCase();
      combo.matches = combo.items.filter((it) =>
        !q || it.full.toLowerCase().includes(q) || it.abbr.toLowerCase().startsWith(q));
      renderCombo();
    }
    function renderCombo() {
      combo.list.innerHTML = "";
      if (!combo.matches.length) {
        const li = el("li", "cx-combo-opt cx-combo-empty");
        li.textContent = "No match"; combo.list.appendChild(li);
      } else {
        combo.matches.forEach((it, i) => {
          const li = el("li", "cx-combo-opt");
          li.setAttribute("role", "option");
          li.setAttribute("aria-selected", i === combo.active);
          li.innerHTML = `<span>${it.full}</span><small>${it.abbr}</small>`;
          li.addEventListener("mousedown", (ev) => { ev.preventDefault(); pickCombo(i); });
          combo.list.appendChild(li);
        });
      }
      openCombo(true);
    }
    function openCombo(o) {
      combo.open = o; combo.list.hidden = !o;
      combo.input.setAttribute("aria-expanded", o);
      if (!o) combo.active = -1;
    }
    function pickCombo(i) {
      const it = combo.matches[i]; if (!it) return;
      spotlight = it.id; combo.input.value = it.full;
      openCombo(false); setCaption(); sky.requestDraw();
    }
    combo.input.addEventListener("focus", () => comboFilter(combo.input.value));
    combo.input.addEventListener("input", () => {
      combo.active = -1;
      if (!combo.input.value.trim() && spotlight >= 0) { spotlight = -1; setCaption(); sky.requestDraw(); }
      comboFilter(combo.input.value);
    });
    combo.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!combo.open) { comboFilter(combo.input.value); return; }
        const dlt = e.key === "ArrowDown" ? 1 : -1;
        combo.active = (combo.active + dlt + combo.matches.length) % combo.matches.length;
        renderCombo();
        const nd = combo.list.children[combo.active];
        if (nd) nd.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault(); pickCombo(combo.active >= 0 ? combo.active : 0);
      } else if (e.key === "Escape") { openCombo(false); combo.input.blur(); }
    });
    combo.input.addEventListener("blur", () => setTimeout(() => openCombo(false), 120));

    sky.canvas.addEventListener("mousemove", (e) => {
      const rect = sky.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const W = sky.getW(), H = sky.getH();
      const shown = d.labels.linkage[step].length;
      let best = -1, bd = 12 * 12;
      for (let i = 0; i < shown; i++) {
        const [x, y] = project(W, H, d.ra[i], d.dec[i]);
        const dx = x - mx, dy = y - my, dist = dx * dx + dy * dy;
        if (dist < bd) { bd = dist; best = i; }
      }
      if (best >= 0) {
        const con = d.constellations[d.con[best]];
        sky.tip.innerHTML = `${d.name[best] || "(unnamed star)"} <small>· ${FULL[con] || con} · mag ${d.mag[best].toFixed(1)}</small>`;
        sky.tip.style.left = mx + "px"; sky.tip.style.top = my + "px";
        sky.tip.dataset.show = "1";
      } else sky.tip.dataset.show = "0";
    });
    sky.canvas.addEventListener("mouseleave", () => (sky.tip.dataset.show = "0"));

    syncSlider(); setScore(); setCaption(); sky.size();
  }

  const BUILDERS = { naive: buildNaive, sphere: buildSphere, chain: buildChain };

  // ---- wire it up --------------------------------------------------------
  figs.forEach((node) => {
    const src = node.dataset.src || "stars.json";
    const build = BUILDERS[node.dataset.fig];
    if (!build) return;
    whenVisible(node, () => load(src).then((d) => build(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the star data.</p>'; console.error(e); }));
  });
  cleans.forEach((node) => {
    const src = node.dataset.src || "stars.json";
    whenVisible(node, () => load(src).then((d) => buildClean(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load data.</p>'; console.error(e); }));
  });
})();
