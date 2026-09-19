/**
 * counter.js - Privacy-respecting Visitor Counter
 * Supports Cloudflare Worker proxy or GoatCounter fallback.
 * Gracefully hides if unconfigured or unreachable.
 */

(function () {
  function animateCount(element, target, duration = 1200) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * ease);

      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(update);
  }

  async function fetchVisitorCount() {
    const config = window.SITE_CONFIG?.counter;
    if (!config || config.provider === "none") {
      return null;
    }

    try {
      if (config.provider === "worker" && config.workerUrl) {
        const response = await fetch(config.workerUrl, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data.total === "number" ? data.total : null;
      }

      if (config.provider === "goatcounter" && config.goatcounterCode) {
        const url = `https://${config.goatcounterCode}.goatcounter.com/counter/TOTAL.json`;
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) return null;
        const data = await response.json();
        // Goatcounter returns { count: "1,234" }
        if (data.count) {
          const parsed = parseInt(data.count.replace(/,/g, ""), 10);
          return isNaN(parsed) ? null : parsed;
        }
      }
    } catch (e) {
      // Fail silently without console errors
      return null;
    }

    return null;
  }

  async function initCounter() {
    const counterContainer = document.getElementById("visitor-counter");
    const countNumberEl = document.getElementById("visitor-count-number");

    if (!counterContainer || !countNumberEl) return;

    const total = await fetchVisitorCount();

    if (total !== null && total > 0) {
      counterContainer.style.display = "inline-flex";
      animateCount(countNumberEl, total);
    } else {
      // Hide if disabled, error, or unconfigured
      counterContainer.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", initCounter);
})();
