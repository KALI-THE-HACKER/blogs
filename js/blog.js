/**
 * blog.js - Archive, Search, and Filtering Logic
 * luckylinux - Technical Engineering Blog
 */

(function () {
  let allPosts = [];
  let selectedTag = null;
  let searchQuery = "";

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      return date.toLocaleDateString("en-US", options);
    }
    return new Date(dateStr).toLocaleDateString("en-US", options);
  }

  function getUrlParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  function updateUrlParams() {
    const params = new URLSearchParams();
    if (selectedTag) params.set("tag", selectedTag);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }

  function renderPostCard(post) {
    const tagsHtml = (post.tags || [])
      .map((t) => `<span class="tag-badge">#${t}</span>`)
      .join("");

    const seriesHtml = post.series
      ? `<span class="series-badge">Series: ${post.series}</span>`
      : "";

    return `
      <article class="post-card-wrapper reveal-on-scroll">
        <a href="./post.html?slug=${post.slug}" class="post-card">
          <div class="post-card-meta">
            <time datetime="${post.date}" class="meta-item">${formatDate(post.date)}</time>
            <span class="meta-sep">•</span>
            <span class="meta-item">${post.readingTime || 5} min read</span>
            ${seriesHtml ? `<span class="meta-sep">•</span>${seriesHtml}` : ""}
          </div>
          <h2 class="post-card-title">${post.title}</h2>
          <p class="post-card-excerpt">${post.excerpt || ""}</p>
          <div class="post-card-tags">
            ${tagsHtml}
          </div>
        </a>
      </article>
    `;
  }

  function renderTagChips(tags, counts) {
    const container = document.getElementById("tag-chips-container");
    if (!container) return;

    let html = `
      <button type="button" class="tag-chip ${!selectedTag ? "is-active" : ""}" data-tag="all">
        All (${allPosts.length})
      </button>
    `;

    tags.forEach((tag) => {
      const isActive = selectedTag === tag ? "is-active" : "";
      const count = counts[tag] || 0;
      html += `
        <button type="button" class="tag-chip ${isActive}" data-tag="${tag}">
          #${tag} (${count})
        </button>
      `;
    });

    container.innerHTML = html;

    // Attach click listeners
    container.querySelectorAll(".tag-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const tag = chip.getAttribute("data-tag");
        selectedTag = tag === "all" ? null : tag;
        updateUrlParams();
        applyFilters();
      });
    });
  }

  function applyFilters() {
    const postsListContainer = document.getElementById("posts-list");
    const emptyState = document.getElementById("posts-empty-state");
    const resultCountEl = document.getElementById("search-results-count");

    if (!postsListContainer) return;

    // Filter posts
    const filtered = allPosts.filter((post) => {
      // Drafts filter: ignore draft posts
      if (post.draft) return false;

      // Tag filter
      if (selectedTag && (!post.tags || !post.tags.includes(selectedTag))) {
        return false;
      }

      // Search query filter (title, excerpt, tags, series)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = post.title.toLowerCase().includes(q);
        const inExcerpt = (post.excerpt || "").toLowerCase().includes(q);
        const inSeries = (post.series || "").toLowerCase().includes(q);
        const inTags = (post.tags || []).some((t) => t.toLowerCase().includes(q));

        if (!inTitle && !inExcerpt && !inSeries && !inTags) {
          return false;
        }
      }

      return true;
    });

    // Update active tag chips
    const chips = document.querySelectorAll(".tag-chip");
    chips.forEach((chip) => {
      const chipTag = chip.getAttribute("data-tag");
      if ((!selectedTag && chipTag === "all") || chipTag === selectedTag) {
        chip.classList.add("is-active");
      } else {
        chip.classList.remove("is-active");
      }
    });

    // Update result count banner if filtering
    if (resultCountEl) {
      if (selectedTag || searchQuery.trim()) {
        resultCountEl.textContent = `Showing ${filtered.length} of ${allPosts.length} post${filtered.length === 1 ? "" : "s"}`;
        resultCountEl.style.display = "block";
      } else {
        resultCountEl.style.display = "none";
      }
    }

    if (filtered.length === 0) {
      postsListContainer.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
    } else {
      if (emptyState) emptyState.style.display = "none";
      postsListContainer.innerHTML = filtered.map(renderPostCard).join("");
    }

    // Trigger scroll-reveal check
    if (window.initScrollReveal) {
      window.initScrollReveal();
    }
  }

  async function initBlogPage() {
    try {
      const res = await fetch("./blogs/posts.json");
      if (!res.ok) throw new Error("Unable to load posts");
      allPosts = await res.json();

      // Collect all tags and frequency
      const tagCounts = {};
      allPosts.forEach((post) => {
        (post.tags || []).forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const uniqueTags = Object.keys(tagCounts).sort();

      // Initialize from URL params
      const initialTag = getUrlParam("tag");
      if (initialTag && uniqueTags.includes(initialTag)) {
        selectedTag = initialTag;
      }

      const initialSearch = getUrlParam("search");
      const searchInput = document.getElementById("blog-search-input");
      const searchClearBtn = document.getElementById("search-clear-btn");

      if (initialSearch && searchInput) {
        searchQuery = initialSearch;
        searchInput.value = initialSearch;
        if (searchClearBtn) searchClearBtn.style.display = "block";
      }

      // Render tags
      renderTagChips(uniqueTags, tagCounts);

      // Search input listeners
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          searchQuery = e.target.value;
          if (searchClearBtn) {
            searchClearBtn.style.display = searchQuery ? "block" : "none";
          }
          updateUrlParams();
          applyFilters();
        });

        // Keyboard shortcut: '/' focuses search input
        window.addEventListener("keydown", (e) => {
          if (e.key === "/" && document.activeElement !== searchInput && !["TEXTAREA", "INPUT"].includes(document.activeElement.tagName)) {
            e.preventDefault();
            searchInput.focus();
          }
        });
      }

      if (searchClearBtn && searchInput) {
        searchClearBtn.addEventListener("click", () => {
          searchInput.value = "";
          searchQuery = "";
          searchClearBtn.style.display = "none";
          updateUrlParams();
          applyFilters();
          searchInput.focus();
        });
      }

      // Initial filter render
      applyFilters();
    } catch (err) {
      console.error("Failed to load blog page posts:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", initBlogPage);
})();
