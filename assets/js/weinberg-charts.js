/* Charts for "Weinbergisms" — two figures rebuilt from the original 2017 post.
 * Same toolkit as the constellation / pockets posts: the shared vz-* / cx-*
 * design system, all color from CSS tokens (so dark/light is automatic with no
 * JS recoloring), data precomputed into one JSON, loaded only on this post.
 *
 *   <div class="cx cx-fig" data-chart="collocations" data-src="weinberg.json"></div>
 *   <div class="cx cx-fig" data-chart="crew"         data-src="weinberg.json"></div>
 *
 * collocations -> ranked PMI leaderboard; a .vz-seg--attached header filters by
 *                 theme, dimming off-theme rows. Bar colors come from --viz-cat-*
 *                 tokens via [data-cat].
 * crew         -> the cited authors funneling rightward into Weinberg; an HTML
 *                 figure with an SVG flow layer, no raster image.
 */
(function () {
  const nodes = [...document.querySelectorAll(".cx-fig[data-chart]")];
  if (!nodes.length) return;

  const cache = {};
  function load(src) {
    if (!cache[src]) cache[src] = fetch(src).then((r) => r.json());
    return cache[src];
  }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function whenVisible(node, cb) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { cb(); io.disconnect(); } });
    }, { threshold: 0.2 });
    io.observe(node);
  }

  // The four category keys map to the shared --viz-cat-{1..4} tokens by order.
  // catIndex(d, key) -> 1..4, set as data-cat so CSS picks up --cat. One source
  // of truth (the JSON's `categories` order) drives both legend and bars.
  function catIndexer(d) {
    const order = Object.keys(d.categories);
    return (key) => order.indexOf(key) + 1;
  }

  // ---- Fig 1: top-20 collocations leaderboard ----------------------------
  // Rank · phrase · bar (length = PMI, color = theme) · score. The attached
  // segmented header filters by theme; off-theme rows dim. Reveals top-down.
  function buildCollocations(node, d) {
    const rows = d.collocations;
    const cats = d.categories;
    const catIndex = catIndexer(d);
    const max = Math.max(...rows.map((r) => r.pmi));
    let filter = "all";

    const title = el("span", "vz-figure-title");
    title.textContent = "figure 1 · the top 20 collocations, by PMI score";
    node.appendChild(title);

    // One framed surface: an attached filter header above the ranked list.
    const frame = el("div", "cx-clean-frame wb-coll-frame");

    const seg = el("div", "vz-seg vz-seg--attached");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Filter collocations by theme");
    // Each button carries a full label and a short one; a container query (keyed
    // to the frame's own width) shows the short label when the chips get tight,
    // so all five stay on one row at any content width.
    const segDefs = [
      ["all", "All", "All", 0],
      ...Object.keys(cats).map((k) => [k, cats[k].label, cats[k].short || cats[k].label, catIndex(k)]),
    ];
    segDefs.forEach(([key, label, short, idx]) => {
      const b = el("button");
      b.dataset.cat = key;
      b.setAttribute("aria-pressed", key === "all");
      // aria-label pins the accessible name to the full label regardless of which
      // span CSS is showing — prevents SR from announcing "Advice Advice to students"
      // when both vz-seg-full and vz-seg-short are in the DOM simultaneously.
      b.setAttribute("aria-label", label);
      const dot = idx ? `<i class="vz-cat-dot" data-cat="${idx}" aria-hidden="true"></i>` : "";
      b.innerHTML = dot +
        `<span class="vz-seg-full" aria-hidden="true">${label}</span>` +
        `<span class="vz-seg-short" aria-hidden="true">${short}</span>`;
      seg.appendChild(b);
    });
    frame.appendChild(seg);

    const inner = el("div", "wb-coll-inner");
    frame.appendChild(inner);

    const items = rows.map((r) => {
      const row = el("div", "wb-coll-row");
      row.dataset.theme = r.cat; // filter key (distinct from the color index)
      row.innerHTML =
        `<span class="wb-coll-rank">${r.rank}</span>` +
        `<span class="wb-coll-phrase">${r.phrase}</span>` +
        `<span class="wb-coll-track"><i class="wb-coll-fill" data-cat="${catIndex(r.cat)}"></i></span>` +
        `<span class="wb-coll-num">${r.pmi.toFixed(2)}</span>`;
      inner.appendChild(row);
      return { row, data: r, fill: row.querySelector(".wb-coll-fill"), pct: (r.pmi / max) * 100 };
    });
    node.appendChild(frame);

    const cap = el("p", "vz-caption");
    function setCaption() {
      const n = filter === "all" ? rows.length : rows.filter((r) => r.cat === filter).length;
      const base = `${d.meta.writings} writings, pulled ${d.meta.pulled}. Scores are PMI ` +
        `normalized by phrase length across ${d.meta.ngrams}; author names removed.`;
      cap.innerHTML = filter === "all"
        ? base
        : `<b>${n}</b> of the top 20 are <b>${cats[filter].label.toLowerCase()}</b>. ` + base;
    }
    node.appendChild(cap);

    function applyFilter() {
      items.forEach((it) =>
        it.row.classList.toggle("is-dim", !(filter === "all" || it.data.cat === filter)));
      setCaption();
    }
    seg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.cat;
        seg.querySelectorAll("button").forEach((x) =>
          x.setAttribute("aria-pressed", x.dataset.cat === filter));
        applyFilter();
      }));

    setCaption();
    whenVisible(node, () => {
      items.forEach((it, i) =>
        setTimeout(() => { it.fill.style.width = it.pct + "%"; }, i * 30));
    });
  }

  // ---- Fig 2: "Weinberg's crew" funnel -----------------------------------
  // Source authors (left) → SVG flow lines → Weinberg hub (right). All HTML/SVG,
  // colored from --viz-cat-* tokens; the flow paths are drawn once we know the
  // laid-out geometry, and redrawn on resize.
  function buildCrew(node, d) {
    const authors = d.crew.authors;
    const catIndex = catIndexer(d);

    const title = el("span", "vz-figure-title");
    title.textContent = "figure 2 · Weinberg's crew — the thinkers feeding his playbook";
    node.appendChild(title);

    const funnel = el("div", "wb-funnel");

    const sources = el("div", "wb-funnel-sources");
    authors.forEach((a) => {
      // Each source is a link to that author's canonical page — delivering the
      // article's "read them to predict his next move" call to action. The
      // avatar is a real circular portrait where a freely-licensed one exists,
      // otherwise a category-colored monogram, so the row stays cohesive.
      const card = el("a", "wb-funnel-card");
      card.dataset.cat = catIndex(a.cat);
      card.href = a.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.setAttribute("aria-label", `${a.name} — ${a.work} (opens in new tab)`);
      const initials = a.name.split(/[\s-]/).filter(Boolean)
        .map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const avatar = a.photo
        ? `<img class="wb-funnel-avatar" src="${a.photo}" width="200" height="200" ` +
            `loading="lazy" decoding="async" alt="${a.name}" />`
        : `<span class="wb-funnel-avatar wb-funnel-avatar--mono" aria-hidden="true">${initials}</span>`;
      card.innerHTML = avatar +
        `<span class="wb-funnel-text">` +
          `<span class="wb-funnel-name">${a.name}</span>` +
          `<span class="wb-funnel-work">${a.work}</span>` +
        `</span>`;
      sources.appendChild(card);
    });
    funnel.appendChild(sources);

    const flow = el("div", "wb-funnel-flow");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    flow.appendChild(svg);
    funnel.appendChild(flow);

    const hub = el("div", "wb-funnel-hub");
    hub.innerHTML =
      `<a class="wb-funnel-hub-link" href="${d.crew.url}" target="_blank" rel="noopener noreferrer" aria-label="Adam Weinberg on Wikipedia (opens in new tab)">` +
        `<img class="wb-funnel-hub-photo" src="${d.crew.photo}" width="240" height="240" ` +
          `loading="lazy" decoding="async" alt="President Adam Weinberg" />` +
      `</a>` +
      `<span class="wb-funnel-hub-label">${d.crew.hub}</span>`;
    funnel.appendChild(hub);

    node.appendChild(funnel);

    const cap = el("p", "vz-caption");
    cap.innerHTML =
      "Five thinkers Weinberg quotes across his writings — Chambliss & Takacs on " +
      "relationships, Cronon on the liberal arts, Boyte and de Tocqueville on civic " +
      "life — all funneling into the playbook he runs at Denison. Read them to " +
      "predict his next move.";
    node.appendChild(cap);

    // Draw one curved path from each source card into the hub, in coordinates
    // relative to the flow layer so the lines track the grid as it reflows.
    // Skipped on the stacked mobile layout, where the SVG is hidden by CSS.
    function drawFlows() {
      if (getComputedStyle(svg).display === "none") return;
      const fr = flow.getBoundingClientRect();
      if (fr.width < 2) return;
      svg.setAttribute("viewBox", `0 0 ${fr.width} ${fr.height}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const hubR = hub.getBoundingClientRect();
      const ex = fr.width;                          // paths end at the hub side
      const ey = (hubR.top + hubR.height / 2) - fr.top;
      const mx = ex * 0.55;                          // control-point inflection
      [...sources.children].forEach((card) => {
        const cr = card.getBoundingClientRect();
        const sy = (cr.top + cr.height / 2) - fr.top;
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", `M 0 ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`);
        p.setAttribute("data-cat", card.dataset.cat);
        svg.appendChild(p);
      });
    }

    // Draw once layout has settled, then keep in sync. A ResizeObserver handles
    // later reflows and the narrow⇄wide breakpoint (CSS hides the SVG; drawFlows
    // then no-ops). We don't lean on RO's initial callback — its first delivery
    // is timing-sensitive — so seedDraw polls a few frames until the flow layer
    // has a real box, drawing as soon as it does (or giving up if it stays
    // hidden, e.g. the mobile layout).
    function seedDraw(tries) {
      if (getComputedStyle(svg).display === "none") return;   // mobile: nothing to draw
      if (flow.getBoundingClientRect().width >= 2) { drawFlows(); return; }
      if (tries > 0) requestAnimationFrame(() => seedDraw(tries - 1));
    }
    seedDraw(10);
    whenVisible(node, () => seedDraw(10));
    if (window.ResizeObserver) new ResizeObserver(drawFlows).observe(flow);
    else window.addEventListener("resize", drawFlows);
  }

  const BUILDERS = { collocations: buildCollocations, crew: buildCrew };

  nodes.forEach((node) => {
    const src = node.dataset.src || "weinberg.json";
    const build = BUILDERS[node.dataset.chart];
    if (!build) return;
    load(src).then((d) => build(node, d))
      .catch((e) => { node.innerHTML = '<p class="vz-caption">Couldn’t load the data.</p>'; console.error(e); });
  });
})();
