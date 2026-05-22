/**
 * nav.js — cross-page transition helper
 * Included in <head> on every page.
 *
 * • Chrome/Edge (View Transitions API): the CSS @view-transition rule in
 *   style.css drives the animation automatically. cbNav() just sets href.
 *
 * • Firefox/Safari (no View Transitions): we fade the html element out
 *   before navigating and fade it in when the new page loads, giving a
 *   smooth entrance on every page change.
 */
(function () {
  var supportsVT = typeof document.startViewTransition === 'function';

  /* ── Fade-in on page load (non-VT browsers only) ─────────────────────── */
  if (!supportsVT) {
    // Set opacity immediately (before first paint) so there's no flash.
    document.documentElement.style.opacity = '0';

    function reveal() {
      requestAnimationFrame(function () {
        document.documentElement.style.transition =
          'opacity .24s cubic-bezier(.16,1,.3,1)';
        document.documentElement.style.opacity = '1';
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reveal);
    } else {
      reveal();
    }
  }

  /* ── Global navigate helper ──────────────────────────────────────────── */
  /**
   * window.cbNav(url)
   * Use instead of window.location.href when you want a transition.
   * VT browsers: just assign href (CSS handles the rest).
   * Others: fade out → navigate (new page fades in via the load handler above).
   */
  window.cbNav = function (url) {
    if (supportsVT) {
      window.location.href = url;
      return;
    }
    document.documentElement.style.transition = 'opacity .16s ease';
    document.documentElement.style.opacity = '0';
    setTimeout(function () { window.location.href = url; }, 170);
  };
})();
