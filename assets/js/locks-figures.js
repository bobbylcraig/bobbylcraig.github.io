/* Locking figures — interactives for the row/gap-lock + isolation post.
 *
 *   <div class="lx lx-gap"></div>   -> a static `users` table you can hover. Real
 *                                       rows of data sit still, ordered by their
 *                                       primary key `id`. Between two rows there's
 *                                       a single, TALLER empty region — the gap —
 *                                       drawn as hatched open space (no fake
 *                                       rows). Hover a real row for its record
 *                                       lock, or the gap for the gap lock that
 *                                       covers all of it. A floating badge narrates.
 *   <div class="lx lx-sim"></div>   -> the hero. Same static table, two
 *                                       transactions racing: T1 runs a locking
 *                                       read for a single id that DOESN'T EXIST
 *                                       (SELECT ... WHERE id = 5 FOR UPDATE) — it
 *                                       finds no row but still gap-locks the gap
 *                                       where 5 would live. T2 then tries to
 *                                       INSERT id=5; a real row materializes
 *                                       inside the gap. Flip the isolation level +
 *                                       advance the timeline to watch the insert
 *                                       block (and time out) or commit.
 *
 * Design intent: a row is a row; a gap is a gap, and it's visibly BIGGER than a
 * row (open space, not a row-clone). The gap is one hatched region; locking it
 * washes the hatch red. On insert, an actual opaque row appears INSIDE the gap
 * (no hatch on the row itself), leaving hatched empty space around it — so you
 * see a real row landing in part of the open space. All real rows stay uniform
 * and aligned; only the gap is the odd, larger element. Nothing changes height
 * (the gap region is fixed); only color / opacity animate.
 *
 * Why id=5 (a miss) rather than a range: this is InnoDB's real, common
 * over-locking footgun — an equality FOR UPDATE on a PK value that doesn't exist
 * locks no row (there isn't one) but STILL gap-locks the interval around it,
 * which then blocks an INSERT of that value. The classic find-or-create race
 * (see the post's references). Colors track the site tokens (dark/light auto);
 * motion respects prefers-reduced-motion. Controls reuse the shared
 * vz-* design-system components (vz-controls, vz-field, vz-seg) shared with the constellation
 * figures).
 */
(function () {
  const gaps = [...document.querySelectorAll(".lx-gap")];
  const sims = [...document.querySelectorAll(".lx-sim")];
  if (!gaps.length && !sims.length) return;

  const REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  // Real rows of `users`, ordered by PK `id`. Ids 4–7 were deleted, leaving one
  // gap between id 3 and id 8. T1 looks up id=5 (in the gap); T2 inserts it.
  const BEFORE = [
    { id: 1, fname: "Alice" },
    { id: 2, fname: "Bob" },
    { id: 3, fname: "Carol" },
  ];
  const AFTER = [
    { id: 8, fname: "Frank" },
    { id: 9, fname: "Grace" },
  ];
  const GAP_LO = 3, GAP_HI = 8;       // open interval (3, 8)
  const INSERT = { id: 5, fname: "Eve" };

  // ---- tiny DOM helpers -------------------------------------------------
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function whenVisible(node, cb) {
    let done = false;
    const fire = () => { if (done) return; done = true; cb(); };
    // threshold 0 with a rootMargin preload, matching the other figures. A ratio
    // threshold can be flaky on a freshly-laid-out box.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fire(); } });
    }, { threshold: 0, rootMargin: "200px 0px" });
    io.observe(node);
    // Fallback: some embedded/headless webviews never deliver IO callbacks. Build
    // on the first scroll/resize that brings the node near the viewport.
    const check = () => {
      const r = node.getBoundingClientRect();
      if (r.top < (window.innerHeight || 0) + 200 && r.bottom > -200) { cleanup(); fire(); }
    };
    const cleanup = () => {
      window.removeEventListener("scroll", check, { passive: true });
      window.removeEventListener("resize", check);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
  }
  function setState(node, prefix, state, all) {
    all.forEach((s) => node.classList.toggle(prefix + s, s === state));
  }
  const tagEl = (cls, text) => `<span class="lx-tag ${cls}">${text}</span>`;

  function dataRow(r, extraCls) {
    const row = el("div", "lx-row" + (extraCls ? " " + extraCls : ""));
    row.dataset.id = r.id;
    row.append(
      el("span", "lx-c lx-c-id", String(r.id)),
      el("span", "lx-c lx-c-name", r.fname),
      el("span", "lx-c lx-c-lock")
    );
    return row;
  }

  // Build the fixed grid: header, the rows before the gap, the GAP REGION (a
  // single taller hatched container with a label + an inserted row that hides
  // until used), then the rows after. A floating status badge sits over the
  // stage. Returns handles.
  function buildTable(mount, opts) {
    opts = opts || {};
    const stage = el("div", "lx-stage");
    const grid = el("div", "lx-grid");

    const head = el("div", "lx-row lx-head");
    head.append(
      el("span", "lx-c lx-c-id", "id"),
      el("span", "lx-c lx-c-name", "fname"),
      el("span", "lx-c lx-c-lock", opts.lockHeader || "")
    );
    grid.appendChild(head);

    const beforeEls = BEFORE.map((r) => { const e = dataRow(r); grid.appendChild(e); return e; });

    // the gap region — one container of open (hatched) space, bigger than a row
    const region = el("div", "lx-gapregion");
    const label = el("span", "lx-gapregion-label", `empty gap · ${GAP_LO} &lt; id &lt; ${GAP_HI}`);
    const note = el("span", "lx-gapregion-note");
    const insertedRow = dataRow(INSERT, "lx-gaprow");
    region.append(label, note, insertedRow);
    grid.appendChild(region);

    const afterEls = AFTER.map((r) => { const e = dataRow(r); grid.appendChild(e); return e; });

    const status = el("div", "lx-status", `<span class="lx-status-text"></span>`);
    stage.appendChild(status);
    stage.appendChild(grid);
    mount.appendChild(stage);

    return {
      stage, grid, beforeEls, afterEls,
      region, regionNote: note, insertedRow,
      status, statusText: status.querySelector(".lx-status-text"),
    };
  }

  // A tone glyph + screen-reader word so the good/bad/info state isn't carried by
  // the left-border color alone (WCAG 1.4.1, use of color).
  const TONE = {
    good: { glyph: "✓", word: "OK" },        // ✓
    bad:  { glyph: "✕", word: "Blocked" },   // ✕
    info: { glyph: "ⓘ", word: "Note" },      // ⓘ
  };
  function setStatus(t, tone, html) {
    if (!html) { t.status.classList.remove("is-shown"); return; }
    setState(t.status, "is-", tone, ["good", "bad", "info"]);
    t.status.classList.add("is-shown");
    const m = TONE[tone] || TONE.info;
    t.statusText.innerHTML =
      `<span class="lx-status-icon" aria-hidden="true">${m.glyph}</span>` +
      `<span class="vz-sr-only">${m.word}: </span>${html}`;
  }

  // ====================================================================
  //  Figure A — hover the static table to see what each lock covers
  // ====================================================================
  function buildGap(node) {
    node.appendChild(el("span", "vz-figure-title",
      "the lockable space · existing rows can be locked, and so can the empty gap between them"));

    const t = buildTable(node, { lockHeader: "what a lock here covers" });
    const cap = el("p", "vz-caption");
    cap.innerHTML =
      `An ordinary <code>users</code> table, ordered by its primary key <code>id</code>. Rows 4–7 were ` +
      `deleted, leaving the open <b>gap</b> in the middle... empty space in the index, bigger than any one ` +
      `row. Hover an existing row, or the gap, to see what a lock there covers.`;
    node.appendChild(cap);

    const allRows = [...t.beforeEls, ...t.afterEls];
    const allData = [...BEFORE, ...AFTER];
    const HINT = `Hover a row or the gap. <b>Existing rows</b> take record locks; the <b>empty gap</b> takes one gap lock over the whole span.`;
    function clear() {
      allRows.forEach((r) => { r.classList.remove("is-hot"); r.querySelector(".lx-c-lock").textContent = ""; });
      t.region.classList.remove("is-hot");
      t.regionNote.textContent = "";
    }
    function showRow(r, data) {
      clear();
      r.classList.add("is-hot");
      r.querySelector(".lx-c-lock").innerHTML = tagEl("lx-tag-rec", "record lock");
      setStatus(t, "info",
        `<b>Record lock · id ${data.id}.</b> Pins this one existing row, so no one else can update or delete it until you commit.`);
    }
    function showGap() {
      clear();
      t.region.classList.add("is-hot");
      t.regionNote.innerHTML = tagEl("lx-tag-gap", "gap lock");
      setStatus(t, "bad",
        `<b>Gap lock · ${GAP_LO} &lt; id &lt; ${GAP_HI}.</b> Locks the whole empty span at once (no row to protect), but no one may <i>insert</i> into it until you commit.`);
    }

    // Make each row and the gap region keyboard-operable: focusable, button
    // semantics, and Enter/Space mirrors the hover/click reveal.
    const activate = (node, label, fn) => {
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", label);
      node.addEventListener("mouseenter", fn);
      node.addEventListener("focus", fn);
      node.addEventListener("click", fn);
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
      });
    };
    allRows.forEach((r, i) =>
      activate(r, `Show the lock taken on row id ${allData[i].id}`, () => showRow(r, allData[i])));
    activate(t.region, `Show the gap lock on the empty span between id ${GAP_LO} and ${GAP_HI}`, showGap);
    t.grid.addEventListener("mouseleave", () => { clear(); setStatus(t, "info", HINT); });

    whenVisible(node, () => setStatus(t, "info", HINT));
  }

  // ====================================================================
  //  Figure B — the hero: two transactions racing under each isolation level
  //
  //  T1: SELECT ... WHERE id = 5 FOR UPDATE   (equality on a row that DOESN'T
  //      exist) -> finds no row, locks no record, but under RR still gap-locks
  //      the empty interval (3,8). T2: INSERT id=5 -> a real row appears in the gap.
  // ====================================================================
  function buildSim(node) {
    const STEPS = [
      { crumb: "Start" },
      { crumb: "T1 looks up id 5" },
      { crumb: "T2 inserts id 5" },
      { crumb: "Resolution" },
    ];
    const MAX_STEP = STEPS.length - 1;

    let iso = "RR";
    let step = 0;

    node.appendChild(el("span", "vz-figure-title",
      "two transactions, one missing row · advance the timeline and watch the locks"));

    const cap = el("p", "vz-caption vz-caption--above");
    cap.innerHTML =
      `T1 looks up a row that doesn't exist (<code>SELECT … WHERE id = 5 FOR UPDATE</code>), then T2 tries ` +
      `to <code>INSERT id = 5</code> into the gap. Advance the timeline; flip the isolation level to compare.`;
    node.appendChild(cap);

    const t = buildTable(node, { lockHeader: "lock held by T1" });

    const controls = el("div", "vz-controls", `
      <div class="vz-field">
        <span class="vz-field-label">Isolation level</span>
        <div class="vz-seg lx-seg" role="group" aria-label="Isolation level">
          <button data-iso="RR" aria-pressed="true">REPEATABLE READ</button>
          <button data-iso="RC" aria-pressed="false">READ COMMITTED</button>
        </div>
      </div>
      <div class="vz-field lx-field-tl">
        <span class="vz-field-label">Timeline</span>
        <div class="lx-timeline">
          <button class="lx-back" aria-label="Previous step">‹</button>
          <nav class="lx-crumbs" aria-label="Timeline steps">
            ${STEPS.map((s, i) => `<button class="lx-crumb" data-step="${i}"><span class="lx-crumb-num" aria-hidden="true">${i + 1}</span><span class="lx-crumb-text">${s.crumb}</span></button>${i < MAX_STEP ? '<span class="lx-crumb-sep" aria-hidden="true">›</span>' : ""}`).join("")}
          </nav>
          <button class="lx-next" aria-label="Next step">›</button>
        </div>
      </div>`);
    node.appendChild(controls);

    const sql = el("div", "lx-sql", `
      <div class="lx-sql-col" data-t="1"><span class="lx-sql-head">Session A · T1</span><pre class="lx-sql-body">—</pre></div>
      <div class="lx-sql-col" data-t="2"><span class="lx-sql-head">Session B · T2</span><pre class="lx-sql-body">—</pre></div>`);
    node.appendChild(sql);

    const dataRows = [...t.beforeEls, ...t.afterEls];

    // --- derived state -------------------------------------------------
    const gapLocked = () => step >= 1 && iso === "RR";
    function t2State() {
      if (step < 2) return "idle";
      if (step === 2) return gapLocked() ? "waiting" : "inserting";
      return gapLocked() ? "timeout" : "done";
    }

    // --- render --------------------------------------------------------
    function render() {
      const gapOn = gapLocked();
      const t2 = t2State();

      // no record locks here — T1's lookup matched nothing
      dataRows.forEach((r) => r.querySelector(".lx-c-lock").innerHTML = "");

      // gap lock washes the empty region red
      t.region.classList.toggle("is-locked-gap", gapOn);
      t.regionNote.innerHTML = gapOn ? tagEl("lx-tag-gap", "gap lock") : "";

      // the inserted row materializes inside the gap once T2 attempts the insert
      const showing = step >= 2;
      t.region.classList.toggle("has-insert", showing);
      setState(t.insertedRow, "is-", showing ? t2 : "", ["waiting", "inserting", "timeout", "done"]);
      t.insertedRow.classList.remove("is-shake");
      if (t2 === "timeout" && !REDUCED) { void t.insertedRow.offsetWidth; t.insertedRow.classList.add("is-shake"); }
      t.insertedRow.querySelector(".lx-c-lock").innerHTML =
        t2 === "waiting" ? tagEl("lx-tag-wait", "waiting on T1…")
        : t2 === "inserting" ? tagEl("lx-tag-wait", "inserting…")
        : t2 === "timeout" ? tagEl("lx-tag-bad", "✕ timed out")
        : t2 === "done" ? tagEl("lx-tag-good", "✓ inserted")
        : "";

      renderStatus(t2);
      renderControls();
      renderSQL(t2);
    }

    function renderStatus(t2) {
      if (step === 0) { setStatus(t, "info", null); return; }
      let tone = "info", html;
      if (step === 1) {
        html = iso === "RR"
          ? `<b>T1 found no row, but still locked the gap.</b> <code>FOR UPDATE</code> on a missing id gap-locks the empty space where it would live.`
          : `<b>T1 found no row, and locked nothing.</b> READ COMMITTED takes no gap lock for a missing id.`;
      } else if (t2 === "waiting") {
        html = `<b>T2 is blocked.</b> Its insert of id 5 must land in the gap T1 locked.`;
      } else if (t2 === "inserting") {
        tone = "good"; html = `<b>T2 inserts freely.</b> No gap lock in the way.`;
      } else if (t2 === "timeout") {
        tone = "bad"; html = `<b>Lock wait timeout.</b> A read that matched nothing just blocked an insert, across a row that never existed.`;
      } else {
        tone = "good"; html = `<b>Both committed.</b> No contention.`;
      }
      setStatus(t, tone, html);
    }

    function renderControls() {
      controls.querySelectorAll("[data-iso]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.iso === iso)));
      controls.querySelectorAll(".lx-crumb").forEach((c, i) => {
        c.classList.toggle("is-done", i < step);
        c.classList.toggle("is-current", i === step);
        c.setAttribute("aria-current", i === step ? "step" : "false");
      });
      controls.querySelector(".lx-back").disabled = step === 0;
      controls.querySelector(".lx-next").disabled = step === MAX_STEP;
    }

    function renderSQL(t2) {
      const a = sql.querySelector('[data-t="1"] .lx-sql-body');
      const b = sql.querySelector('[data-t="2"] .lx-sql-body');
      const setIso = iso === "RC" ? "SET TRANSACTION ISOLATION LEVEL READ COMMITTED;\n" : "";
      const note = iso === "RR" ? "  -- 0 rows, gap locked!" : "  -- 0 rows, no lock";
      const aL = [], bL = [];
      if (step >= 1) {
        aL.push(setIso + "BEGIN;",
          "SELECT * FROM users",
          "  WHERE id = 5",
          "  FOR UPDATE;" + note);
      }
      if (step >= 2) bL.push("BEGIN;", "INSERT INTO users (id, fname)", "  VALUES (5, 'Eve');");
      if (step >= 3) {
        if (t2 === "timeout") {
          bL.push("-- ERROR 1205 (HY000):", "--   Lock wait timeout exceeded");
          aL.push("COMMIT;   -- frees the gap at last");
        } else {
          bL.push("COMMIT;          -- inserted, no wait");
          aL.push("COMMIT;");
        }
      }
      a.textContent = aL.join("\n") || "—";
      b.textContent = bL.join("\n") || "—";
      b.parentElement.dataset.state = t2 === "timeout" ? "bad" : t2 === "done" ? "good" : "";
    }

    // --- wiring --------------------------------------------------------
    const go = (s) => { step = Math.max(0, Math.min(MAX_STEP, s)); render(); };
    controls.querySelectorAll("[data-iso]").forEach((b) =>
      b.addEventListener("click", () => { iso = b.dataset.iso; render(); }));
    controls.querySelector(".lx-next").addEventListener("click", () => go(step + 1));
    controls.querySelector(".lx-back").addEventListener("click", () => go(step - 1));
    controls.querySelectorAll(".lx-crumb").forEach((c) =>
      c.addEventListener("click", () => go(+c.dataset.step)));

    whenVisible(node, render);
  }

  gaps.forEach(buildGap);
  sims.forEach(buildSim);
})();
