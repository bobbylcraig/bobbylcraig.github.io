// Shared at build time, never requested at runtime. Each route-local script gets
// its own cache and lifecycle helpers without adding a global bundle.
const vizRuntime = (() => {
  const cache = new Map();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  function loadJSON(src) {
    if (!cache.has(src)) {
      cache.set(src, fetch(src).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${src}: ${response.status}`);
        return response.json();
      }));
    }
    return cache.get(src);
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function isDark() {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }

  function whenVisible(node, callback, rootMargin = "200px 0px") {
    let done = false;
    const fire = () => { if (!done) { done = true; callback(); } };
    if (window.IntersectionObserver) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); fire(); }
      }, { threshold: 0, rootMargin });
      observer.observe(node);
    }
    const check = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < (window.innerHeight || 0) + 200 && rect.bottom > -200) {
        cleanup(); fire();
      }
    };
    const cleanup = () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
  }

  function sizeCanvas(canvas, width, height) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function rafThrottle(fn) {
    let queued = false;
    let lastArgs;
    return (...args) => {
      lastArgs = args;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
    };
  }

  function onThemeChange(callback) {
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", callback);
  }

  return { dpr, reducedMotion, loadJSON, el, cssVar, isDark, whenVisible, sizeCanvas, rafThrottle, onThemeChange };
})();
