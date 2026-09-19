/**
 * main.js - Core UI Interactions, Scroll Reveal, Progress Bar, and Global Init
 * luckylinux - Technical Engineering Blog
 */

(function () {
  // Mobile Navigation Toggle
  function initMobileNav() {
    const toggleBtn = document.getElementById("mobile-nav-toggle");
    const navMenu = document.getElementById("nav-menu");

    if (!toggleBtn || !navMenu) return;

    toggleBtn.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close on escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("is-open")) {
        navMenu.classList.remove("is-open");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (navMenu.classList.contains("is-open") && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove("is-open");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Active Navigation Link Detection
  function highlightActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll(".nav-link:not(.nav-link-external)");

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      // Clean href and currentPath for comparison
      const cleanHref = href.replace("./", "").replace(".html", "");
      const cleanPath = currentPath.split("/").pop().replace(".html", "");

      if (cleanPath === cleanHref || (cleanPath === "" && (cleanHref === "index" || cleanHref === ""))) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Reading Progress Bar (post pages)
  function initReadingProgressBar() {
    const progressBar = document.getElementById("reading-progress-bar");
    if (!progressBar) return;

    function updateProgress() {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        progressBar.style.width = "0%";
        return;
      }
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const progress = Math.min(Math.max((scrollY / totalHeight) * 100, 0), 100);
      progressBar.style.width = `${progress}%`;
    }

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    updateProgress();
  }

  // IntersectionObserver for subtle fade-in-up animations
  function initScrollReveal() {
    // Respect prefers-reduced-motion
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal-on-scroll").forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const elements = document.querySelectorAll(".reveal-on-scroll:not(.is-revealed)");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -40px 0px",
        threshold: 0.05
      }
    );

    elements.forEach((el) => observer.observe(el));
  }

  // Inject Plausible analytics if configured (and not already in DOM)
  function initAnalytics() {
    if (document.querySelector('script[data-domain="blog.luckylinux.dev"]') || document.querySelector('script[src*="analytics.luckylinux.dev"]')) return;
    const config = window.SITE_CONFIG?.analytics;
    if (config?.plausibleDomain && config?.plausibleScriptSrc) {
      const script = document.createElement("script");
      script.defer = true;
      script.setAttribute("data-domain", config.plausibleDomain);
      script.src = config.plausibleScriptSrc;
      document.head.appendChild(script);
    }
  }

  // Footer year
  function setFooterYear() {
    const yearEl = document.getElementById("footer-year");
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();
    highlightActiveNav();
    initReadingProgressBar();
    initScrollReveal();
    initAnalytics();
    setFooterYear();
  });

  window.initScrollReveal = initScrollReveal;
})();
