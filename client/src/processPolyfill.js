/**
 * Optional polyfill for Node's process (used by some libs in the browser).
 * Must be imported first so it runs before any code that references process.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.process && window.process.nextTick) return;
  window.process = {
    nextTick: function (fn) {
      setTimeout(fn, 0);
    },
    browser: true,
    env: {},
  };
})();
