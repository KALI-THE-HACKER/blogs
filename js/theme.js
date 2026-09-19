/**
 * theme.js - Theme Switcher and Persistence (Light / Dark)
 * luckylinux - Technical Engineering Blog
 */

(function () {
  const THEME_STORAGE_KEY = "luckylinux_theme";

  /**
   * Determine the initial theme preference:
   * 1. Check localStorage for user explicit selection
   * 2. Check system prefers-color-scheme
   * 3. Fallback to 'light'
   */
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  /**
   * Apply theme to root <html> element
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;

    // Update aria-label and status on toggle button if available
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
      toggleBtn.setAttribute("title", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    }

    // Dispatch event for components that need to respond (like Mermaid)
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
  }

  /**
   * Set theme and persist to localStorage
   */
  function setTheme(theme) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }

  /**
   * Toggle between light and dark
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  }

  // Initialize immediately
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Expose API
  window.ThemeManager = {
    getPreferredTheme,
    applyTheme,
    setTheme,
    toggleTheme,
    getCurrentTheme: () => document.documentElement.getAttribute("data-theme") || "light"
  };

  // Wire up listeners when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", toggleTheme);
    }

    // Listen for OS system theme changes (if user hasn't explicitly set one)
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          applyTheme(e.matches ? "dark" : "light");
        }
      });
    }
  });
})();
