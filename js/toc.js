/**
 * toc.js - Table of Contents Generator and Scroll-Spy
 * luckylinux - Technical Engineering Blog
 */

(function () {
  /**
   * Builds the Table of Contents from h2 and h3 elements in the .prose container
   */
  function generateTOC() {
    const prose = document.querySelector(".prose");
    const desktopTocNav = document.getElementById("desktop-toc-nav");
    const mobileTocNav = document.getElementById("mobile-toc-nav");
    const tocSidebar = document.getElementById("toc-sidebar");
    const mobileTocDetails = document.getElementById("mobile-toc-details");

    if (!prose || (!desktopTocNav && !mobileTocNav)) return;

    const headings = Array.from(prose.querySelectorAll("h2, h3"));

    // If there are fewer than 2 headings, hide TOC
    if (headings.length < 2) {
      if (tocSidebar) tocSidebar.style.display = "none";
      if (mobileTocDetails) mobileTocDetails.style.display = "none";
      return;
    }

    const ol = document.createElement("ol");

    headings.forEach((heading) => {
      // Ensure heading has an ID
      if (!heading.id) {
        heading.id = heading.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }

      const li = document.createElement("li");
      li.className = heading.tagName.toLowerCase() === "h3" ? "toc-h3" : "toc-h2";

      const a = document.createElement("a");
      a.href = `#${heading.id}`;
      a.className = "toc-link";
      a.textContent = heading.textContent.replace(/#$/, "").trim(); // strip anchor symbol if already present

      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(heading.id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
          history.replaceState(null, "", `#${heading.id}`);
        }
      });

      li.appendChild(a);
      ol.appendChild(li);
    });

    if (desktopTocNav) {
      desktopTocNav.innerHTML = "";
      desktopTocNav.appendChild(ol.cloneNode(true));
      // Re-attach listeners to cloned nodes
      desktopTocNav.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const targetId = a.getAttribute("href").substring(1);
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            history.replaceState(null, "", `#${targetId}`);
          }
        });
      });
    }

    if (mobileTocNav) {
      mobileTocNav.innerHTML = "";
      mobileTocNav.appendChild(ol);
      mobileTocNav.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const targetId = a.getAttribute("href").substring(1);
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            history.replaceState(null, "", `#${targetId}`);
            // Close mobile details after selection
            if (mobileTocDetails) mobileTocDetails.removeAttribute("open");
          }
        });
      });
    }

    initScrollSpy(headings);
  }

  /**
   * Initializes IntersectionObserver to track and highlight active heading in TOC
   */
  function initScrollSpy(headings) {
    if (!headings || headings.length === 0) return;

    const tocLinks = document.querySelectorAll(".toc-link");
    let activeId = null;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible headings
        const visibleHeadings = entries.filter((entry) => entry.isIntersecting);
        if (visibleHeadings.length > 0) {
          // Choose the one highest in view
          const topHeading = visibleHeadings.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          activeId = topHeading.target.id;
          updateActiveLink(activeId);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0
      }
    );

    headings.forEach((heading) => observer.observe(heading));

    function updateActiveLink(id) {
      tocLinks.forEach((link) => {
        if (link.getAttribute("href") === `#${id}`) {
          link.classList.add("is-active");
        } else {
          link.classList.remove("is-active");
        }
      });
    }

    // Scroll fallback for top of page
    window.addEventListener("scroll", () => {
      if (window.scrollY < 150 && headings.length > 0) {
        updateActiveLink(headings[0].id);
      }
    }, { passive: true });
  }

  window.initTOC = generateTOC;
})();
