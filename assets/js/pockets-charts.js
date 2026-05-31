/* Charts for "A Case For Bigger Pockets" — three plain-canvas figures that read
 * the site's own theme tokens (so dark/light is automatic) and draw once they
 * scroll into view with a short reveal. Same approach as the constellation post:
 * no chart library, data precomputed into one JSON, loaded only on this post.
 *
 *   <div class="cx-figure" data-chart="timeseries" data-src="pockets.json"></div>
 *   <div class="cx-figure" data-chart="byday"      data-src="pockets.json"></div>
 *   <div class="cx-figure" data-chart="gender"     data-src="pockets.json"></div>
 */
(function () {
  const nodes = [...document.querySelectorAll(".cx-figure[data-chart]")];
  if (!nodes.length) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const cache = {};
  function load(src) {
    if (!cache[src]) cache[src] = fetch(src).then((r) => r.json());
    return cache[src];
  }
  function cssVar(n, f) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function whenVisible(node, cb) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { cb(); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(node);
  }

  // Shared series palette — the same tokens the line chart and sky figures use.
  function colAll() { return cssVar("--viz-naive", "#9aa0a6"); }
  function colLost() { return cssVar("--brand", "#1b69d1"); }

  // Builds title + canvas + optional legend, wires resize / theme / reveal, and
  // hands the caller a `paint(ctx, W, H, reveal)` to fill. Mirrors makeSky.
  function makeChart(node, opts) {
    if (opts.title) {
      const t = el("p", "cx-figure-title");
      t.textContent = opts.title;
      node.appendChild(t);
    }
    const canvas = el("canvas", "cx-bars");
    const ctx = canvas.getContext("2d");
    node.appendChild(canvas);

    let legend;
    if (opts.legend) {
      legend = el("div", "cx-legend");
      node.appendChild(legend);
    }
    if (opts.caption) {
      const cap = el("p", "cx-caption");
      cap.textContent = opts.caption;
      node.appendChild(cap);
    }

    let W = 0, H = 0, reveal = 0, raf = null;
    function buildLegend() {
      if (!legend) return;
      legend.innerHTML = "";
      opts.legend().forEach((s) => {
        const span = el("span");
        span.innerHTML = `<i style="background:${s.color}"></i>${s.label}`;
        legend.appendChild(span);
      });
    }
    function size() {
      const rect = node.getBoundingClientRect();
      W = Math.max(300, rect.width);
      H = Math.round(Math.min(opts.maxH || 340, Math.max(opts.minH || 200, W * (opts.aspect || 0.5))));
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      draw();
    }
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      opts.paint(ctx, W, H, reveal);
    }
    function animate() {
      reveal = 0;
      (function step() {
        reveal = Math.min(1, reveal + 0.045);
        draw();
        if (reveal < 1) raf = requestAnimationFrame(step);
      })();
    }

    window.addEventListener("resize", size);
    if (window.matchMedia)
      window.matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => { buildLegend(); draw(); });

    return { canvas, ctx, buildLegend, size, animate };
  }

  // Round up to a "nice" axis max — finer steps than a bare power-of-ten so a
  // peak of 250 tops out at 300, not 500.
  function niceCeil(v) {
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  // Pick a horizontal-gridline count that divides ymax into round labels
  // (e.g. 300 → 3 ticks of 100, not 4 ticks of 75). Prefers ~4 lines.
  function gridCount(ymax) {
    for (const n of [4, 5, 3, 2]) if ((ymax / n) % 1 === 0) return n;
    return 4;
  }

  // ---- Fig 1: all posts vs lost-item posts over time (line) --------------
  function buildTimeseries(node, d) {
    const data = d.timeseries;
    const chart = makeChart(node, {
      title: "Figure 1 · all posts vs. lost-item posts, by month",
      aspect: 0.52, maxH: 320,
      legend: () => [
        { label: "All posts", color: colAll() },
        { label: "Lost-item posts", color: colLost() },
      ],
      caption: `${d.meta.total_posts.toLocaleString()} posts, ${data[0].ym} to ` +
        `${data[data.length - 1].ym}. Lost items (${d.meta.lost_pct}%) track the ` +
        `group's rhythm: busy in semesters, quiet over summer.`,
      paint: (ctx, W, H, reveal) => {
        const soft = cssVar("--text-soft", "#6a6a6a");
        const grid = cssVar("--border", "#d0d0d0");
        const padL = 38, padR = 12, padT = 12, padB = 34;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        const ymax = niceCeil(Math.max(...data.map((p) => p.all)));
        const X = (i) => padL + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotW);
        const Y = (v) => padT + (1 - v / ymax) * plotH;

        // Summer shading: mid-May to mid-August each year. Months are evenly
        // spaced, so half a month-step on either side approximates the "mid".
        const half = data.length > 1 ? (X(1) - X(0)) / 2 : 0;
        const monthIdx = (yr, mo) => data.findIndex((p) => p.ym === `${yr}-${mo}`);
        const summer = cssVar("--text-soft", "#6a6a6a");
        const years = [...new Set(data.map((p) => p.ym.slice(0, 4)))];
        ctx.save();
        ctx.fillStyle = summer; ctx.globalAlpha = 0.06;
        years.forEach((yr) => {
          const a = monthIdx(yr, "05"), b = monthIdx(yr, "08");
          if (a < 0 || b < 0) return;
          const x0 = X(a) + half, x1 = X(b) - half;
          ctx.fillRect(x0, padT, x1 - x0, plotH);
        });
        ctx.restore();

        ctx.font = "11px " + cssVar("--chrome", "sans-serif");
        ctx.fillStyle = soft; ctx.strokeStyle = grid; ctx.lineWidth = 1;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        const gn = gridCount(ymax);
        for (let g = 0; g <= gn; g++) {
          const v = (ymax / gn) * g, y = Y(v);
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillText(String(Math.round(v)), padL - 6, y);
        }
        // x labels: one tick per year, placed at that year's January so the
        // labels stay evenly spaced. (The series opens on 2014-12, a lone partial
        // month — labeling it would collide with 2015's tick right beside it.)
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        data.forEach((p, i) => {
          const [yr, mo] = p.ym.split("-");
          if (mo === "01") ctx.fillText(yr, X(i), H - padB + 8);
        });

        const cut = padL + plotW * reveal;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, cut, H); ctx.clip();
        [["all", colAll()], ["lost", colLost()]].forEach(([key, color]) => {
          ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = "round";
          ctx.beginPath();
          data.forEach((p, i) => { const x = X(i), y = Y(p[key]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke();
        });
        ctx.restore();
      },
    });
    chart.buildLegend();
    chart.size();
    whenVisible(node, chart.animate);
  }

  // ---- Fig 3: posts by day of week (grouped bars, all vs lost) -----------
  function buildByday(node, d) {
    const data = d.byday;
    const chart = makeChart(node, {
      title: "Figure 3 · posts by day of the week",
      aspect: 0.5, maxH: 320,
      legend: () => [
        { label: "All posts", color: colAll() },
        { label: "Lost-item posts", color: colLost() },
      ],
      caption: "Lost-item posts climb into the weekend. The two series sit on " +
        "separate scales so each fills the chart; the days don't line up.",
      paint: (ctx, W, H, reveal) => {
        const soft = cssVar("--text-soft", "#6a6a6a");
        const grid = cssVar("--border", "#d0d0d0");
        const padL = 38, padR = 30, padT = 12, padB = 30;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        // Each series gets its own scale so the lost-item shape isn't flattened
        // against the much larger all-posts counts. Left axis = all, right = lost.
        const maxAll = niceCeil(Math.max(...data.map((p) => p.all)));
        const maxLost = niceCeil(Math.max(...data.map((p) => p.lost)));
        const Yall = (v) => padT + (1 - v / maxAll) * plotH;
        const Ylost = (v) => padT + (1 - v / maxLost) * plotH;
        const band = plotW / data.length;
        const bw = Math.min(26, band * 0.34);
        const base = padT + plotH;

        ctx.font = "11px " + cssVar("--chrome", "sans-serif");
        const gn = gridCount(maxAll);
        ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.textBaseline = "middle";
        for (let g = 0; g <= gn; g++) {
          const y = padT + (1 - g / gn) * plotH;
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = colAll(); ctx.textAlign = "right";
          ctx.fillText(String(Math.round((maxAll / gn) * g)), padL - 6, y);
          ctx.fillStyle = colLost(); ctx.textAlign = "left";
          ctx.fillText(String(Math.round((maxLost / gn) * g)), W - padR + 6, y);
        }

        ctx.textAlign = "center"; ctx.textBaseline = "top";
        data.forEach((p, i) => {
          const cx = padL + band * i + band / 2;
          const bars = [
            ["all", colAll(), -bw - 1, Yall],
            ["lost", colLost(), 1, Ylost],
          ];
          bars.forEach(([key, color, off, scale]) => {
            const h = (base - scale(p[key])) * reveal;
            ctx.fillStyle = color;
            ctx.fillRect(cx + off, base - h, bw, h);
          });
          ctx.fillStyle = soft;
          ctx.fillText(p.day.slice(0, 3), cx, H - padB + 7);
        });
      },
    });
    chart.buildLegend();
    chart.size();
    whenVisible(node, chart.animate);
  }

  // ---- Fig 4: lost-item posters by gender (one split bar) ----------------
  // Whole-width = all lost-item posts, split into a women / men segment — same
  // idea as the constellation post's "how little of the sky is naked-eye" bar.
  function buildGender(node, d) {
    const f = d.gender.f, m = d.gender.m, total = f + m;

    const title = el("p", "cx-figure-title");
    title.textContent = "Figure 4 · who posts about lost items";
    node.appendChild(title);

    const frame = el("div", "cx-split-frame");
    const bar = el("div", "cx-split");
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label",
      `Of ${total} lost-item posts, ${f} were from women and ${m} from men.`);
    const segF = el("div", "cx-split-seg is-women");
    const segM = el("div", "cx-split-seg is-men");
    segF.innerHTML = `<span class="cx-split-label">Women</span><span class="cx-split-num">${f}</span>`;
    segM.innerHTML = `<span class="cx-split-label">Men</span><span class="cx-split-num">${m}</span>`;
    bar.appendChild(segF); bar.appendChild(segM);
    frame.appendChild(bar);
    node.appendChild(frame);

    const cap = el("p", "cx-caption");
    cap.textContent =
      `${total} lost-item posts: ${f} from women, ${m} from men ` +
      `(${d.headline.gender_ratio}×), though the group skews even overall.`;
    node.appendChild(cap);

    whenVisible(node, () => {
      requestAnimationFrame(() => {
        segF.style.flexBasis = (f / total) * 100 + "%";
        segM.style.flexBasis = (m / total) * 100 + "%";
      });
    });
  }

  const BUILDERS = { timeseries: buildTimeseries, byday: buildByday, gender: buildGender };

  nodes.forEach((node) => {
    const src = node.dataset.src || "pockets.json";
    const build = BUILDERS[node.dataset.chart];
    if (!build) return;
    load(src).then((d) => build(node, d))
      .catch((e) => { node.innerHTML = '<p class="cx-caption">Couldn’t load the data.</p>'; console.error(e); });
  });
})();
