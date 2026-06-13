/* Score-vs-magnitude line chart — the finding, in one picture.
 * Three lines (naive / sphere / chain-following) showing reproducibility (NMI)
 * climbing as we keep only the brighter stars. Plain canvas, theme-aware,
 * draws itself once in view with a short reveal animation. */
(function () {
  const root = document.getElementById("cx-chart");
  if (!root) return;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.className = "cx-chart";
  const ctx = canvas.getContext("2d");
  root.appendChild(canvas);

  const legend = document.createElement("div");
  legend.className = "cx-legend";
  root.appendChild(legend);

  const SERIES = [
    { key: "naive_nmi", label: "Naive (flat)", color: () => "#9aa0a6" },
    { key: "sphere_nmi", label: "On the sphere", color: () => cssVar("--brand", "#1b69d1") },
    { key: "linkage_nmi", label: "Chain-following", color: () => "#e0823d" },
  ];

  let curve = null, W = 0, H = 0, reveal = 0, rafId = null, lastTs = null;
  let resizeTimer = null;

  function cssVar(n, f) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  }

  function resize() {
    const rect = root.getBoundingClientRect();
    W = Math.max(320, rect.width);
    H = Math.round(Math.min(360, Math.max(220, W * 0.5)));
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    draw();
  }

  const REVEAL_DURATION_MS = 650;

  function draw(ts) {
    if (!curve) return;
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const text = cssVar("--text", dark ? "#e8e8ea" : "#111");
    const soft = cssVar("--text-soft", "#6a6a6a");
    const grid = cssVar("--border", dark ? "#3a3a3f" : "#d0d0d0");

    // Advance reveal by wall-clock time so it's frame-rate independent.
    if (reveal < 1 && ts != null) {
      if (lastTs == null) lastTs = ts;
      reveal = Math.min(1, reveal + (ts - lastTs) / REVEAL_DURATION_MS);
      lastTs = ts;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(DPR, DPR);

    const padL = 44, padR = 14, padT = 16, padB = 38;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    // x = magnitude limit (reverse: faint left -> bright right, matching "keep brighter")
    const mags = curve.map((c) => c.mag);
    const xmin = mags.reduce((a, b) => Math.min(a, b));
    const xmax = mags.reduce((a, b) => Math.max(a, b));
    const ymin = 0.7, ymax = 0.95;
    const X = (m) => padL + (1 - (m - xmin) / (xmax - xmin)) * plotW;
    const Y = (v) => padT + (1 - (v - ymin) / (ymax - ymin)) * plotH;

    // Resolve colors once per draw — avoids repeated getComputedStyle per dot.
    const colors = SERIES.map((s) => s.color());

    // y gridlines + labels
    ctx.font = "11px " + cssVar("--chrome", "sans-serif");
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.strokeStyle = grid; ctx.fillStyle = soft; ctx.lineWidth = 1;
    for (let v = 0.7; v <= 0.95 + 1e-9; v += 0.05) {
      const y = Y(v);
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(v.toFixed(2), padL - 7, y);
    }
    // x labels
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    curve.forEach((c) => {
      ctx.fillText("+" + c.mag.toFixed(1), X(c.mag), H - padB + 7);
    });
    ctx.fillStyle = soft; ctx.textBaseline = "top";
    ctx.fillText("← keep only brighter stars      magnitude limit      keep fainter stars →",
      W / 2, H - 14);

    // lines (revealed left-to-right via clip on reveal fraction)
    // The clip rect is in post-scale (CSS-pixel) space, matching X/Y helpers.
    const cut = padL + plotW * reveal;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, cut, H); ctx.clip();
    SERIES.forEach((s, si) => {
      const col = colors[si];
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
      ctx.beginPath();
      curve.forEach((c, i) => {
        const x = X(c.mag), y = Y(c[s.key]);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      // endpoint dots
      ctx.fillStyle = col;
      curve.forEach((c) => {
        ctx.beginPath(); ctx.arc(X(c.mag), Y(c[s.key]), 2.6, 0, Math.PI * 2); ctx.fill();
      });
    });
    ctx.restore();
    ctx.restore();

    if (reveal < 1) {
      rafId = requestAnimationFrame(draw);
    }
  }

  function buildLegend() {
    legend.innerHTML = "";
    SERIES.forEach((s) => {
      const span = document.createElement("span");
      span.innerHTML = `<i style="background:${s.color()}"></i>${s.label}`;
      legend.appendChild(span);
    });
  }

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 100);
  });
  if (window.matchMedia)
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => { buildLegend(); draw(); });

  const src = root.dataset.src || "stars.json";
  fetch(src).then((r) => r.json()).then((d) => {
    curve = d.curve;
    buildLegend();
    resize();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { reveal = 0; lastTs = null; rafId = requestAnimationFrame(draw); io.disconnect(); } });
    }, { threshold: 0.35 });
    io.observe(root);
  }).catch((e) => { root.innerHTML = '<p class="vz-caption">Couldn’t load data.</p>'; console.error(e); });
})();
