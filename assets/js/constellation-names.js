// The two deferred constellation figures consume the same data file. This
// small, post-scoped promise cache lets them share one request without adding a
// site-wide runtime or changing their independent builders.
window.CX_LOAD_JSON = (() => {
  const cache = new Map();
  return (src) => {
    if (!cache.has(src)) cache.set(src, fetch(src).then((response) => response.json()));
    return cache.get(src);
  };
})();
