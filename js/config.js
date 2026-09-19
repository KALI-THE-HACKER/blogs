/**
 * config.js - Global Site Configuration & Metadata
 * luckylinux - Technical Engineering Blog
 */

const SITE_CONFIG = {
  // Site Information
  title: "luckylinux",
  subtitle: "engineering notes",
  description: "Notes on building, deploying, and debugging backend systems, distributed infrastructure, and real-world software architecture.",
  siteUrl: "https://blog.luckylinux.dev", // or https://kali-the-hacker.github.io/blogs
  repoUrl: "https://github.com/KALI-THE-HACKER/blogs",
  repoBranch: "main",

  // Author Information
  author: {
    name: "Lucky Verma",
    handle: "luckylinux",
    portfolioUrl: "https://luckylinux.dev",
    githubUrl: "https://github.com/KALI-THE-HACKER",
    linkedinUrl: "https://linkedin.com/in/luckylinux",
    bio: "B.Tech Computational & Data Science student at NITK Surathkal. Building backend infrastructure, self-hosting systems, and distributed services."
  },

  // Analytics (Self-hosted Plausible)
  // Set plausibleDomain to your domain (e.g., "blog.luckylinux.dev") to enable.
  // Leave empty or null to disable.
  analytics: {
    plausibleDomain: "blog.luckylinux.dev",
    plausibleScriptSrc: "https://analytics.luckylinux.dev/js/script.js"
  },

  // Visitor Counter
  // provider: "worker" | "goatcounter" | "none"
  counter: {
    provider: "none", // Change to "worker" or "goatcounter" when deployed
    // For "worker":
    workerUrl: "https://plausible-counter.luckylinux.workers.dev",
    // For "goatcounter":
    goatcounterCode: "luckylinux-blog" // e.g. https://luckylinux-blog.goatcounter.com
  },

  // Reading settings
  wordsPerMinute: 200
};

// Export for ES modules or attach to global window
if (typeof window !== "undefined") {
  window.SITE_CONFIG = SITE_CONFIG;
}
