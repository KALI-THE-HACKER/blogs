/**
 * post.js - Dynamic Article Renderer
 * Markdown parsing (marked.js), Sanitization (DOMPurify),
 * Syntax Highlighting (highlight.js), Mermaid diagrams,
 * Callouts, TOC integration, and metadata management.
 */

(function () {
  const CDN_MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
  let mermaidLoaded = false;

  // Utility to extract query parameter
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Calculate reading time
  function calculateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const wpm = window.SITE_CONFIG?.wordsPerMinute || 200;
    return Math.max(1, Math.ceil(words / wpm));
  }

  // Format date to "Sep 19, 2026"
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    // Force UTC parsing to prevent local timezone day shifts
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      return date.toLocaleDateString("en-US", options);
    }
    return new Date(dateStr).toLocaleDateString("en-US", options);
  }

  // Setup dynamic Open Graph & Twitter meta tags
  function updateMetaTags(post) {
    const config = window.SITE_CONFIG || {};
    const title = `${post.title} — ${config.title || "luckylinux"}`;
    document.title = title;

    // Helper to set meta content
    function setMeta(selector, value) {
      if (!value) return;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const [attr, attrVal] = selector.replace(/[\[\]]/g, "").split("=");
        el.setAttribute(attr, attrVal.replace(/['"]/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    }

    setMeta("meta[name='description']", post.excerpt);
    setMeta("meta[property='og:title']", post.title);
    setMeta("meta[property='og:description']", post.excerpt);
    setMeta("meta[property='og:type']", "article");
    setMeta("meta[property='og:url']", window.location.href);

    if (post.cover) {
      const coverUrl = post.cover.startsWith("http")
        ? post.cover
        : new URL(post.cover, window.location.href).href;
      setMeta("meta[property='og:image']", coverUrl);
      setMeta("meta[name='twitter:image']", coverUrl);
    }

    setMeta("meta[name='twitter:card']", "summary_large_image");
    setMeta("meta[name='twitter:title']", post.title);
    setMeta("meta[name='twitter:description']", post.excerpt);
  }

  // Toast notification helper
  function showToast(message = "Link copied to clipboard") {
    let toast = document.getElementById("toast-notice");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast-notice";
      toast.className = "toast-notice";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  // Lazy-load Mermaid from CDN and render diagrams
  async function loadAndRenderMermaid() {
    const diagrams = document.querySelectorAll(".mermaid");
    if (diagrams.length === 0) return;

    if (!mermaidLoaded) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = CDN_MERMAID;
        script.onload = () => {
          mermaidLoaded = true;
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    if (window.mermaid) {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      window.mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "neutral",
        fontFamily: "Inter, sans-serif",
        securityLevel: "loose"
      });

      try {
        await window.mermaid.run({
          nodes: diagrams
        });
      } catch (err) {
        console.warn("Mermaid rendering warning:", err);
      }
    }
  }

  // Re-run Mermaid when theme changes
  window.addEventListener("themeChanged", () => {
    if (mermaidLoaded) {
      // Re-initialize mermaid with new theme
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      window.mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "neutral",
        fontFamily: "Inter, sans-serif"
      });
    }
  });

  // Main post initialization
  async function initPost() {
    const slug = getQueryParam("slug");
    const articleContainer = document.getElementById("post-article-content");
    const loadingContainer = document.getElementById("post-loading");
    const errorContainer = document.getElementById("post-error");

    if (!slug) {
      if (loadingContainer) loadingContainer.style.display = "none";
      if (errorContainer) errorContainer.style.display = "block";
      return;
    }

    try {
      // Fetch posts manifest
      const manifestRes = await fetch("./blogs/posts.json");
      if (!manifestRes.ok) throw new Error("Could not load posts manifest");
      const posts = await manifestRes.json();

      const postIndex = posts.findIndex((p) => p.slug === slug);
      if (postIndex === -1) throw new Error("Post not found");
      const post = posts[postIndex];

      // Fetch markdown file
      const markdownRes = await fetch(`./blogs/${slug}/post.md`);
      if (!markdownRes.ok) throw new Error("Could not load post content");
      let markdown = await markdownRes.text();

      // Clean sample draft comment if present for display or keep as note
      // Strip frontmatter if author used YAML --- blocks
      if (markdown.startsWith("---")) {
        const endFrontmatter = markdown.indexOf("---", 3);
        if (endFrontmatter !== -1) {
          markdown = markdown.substring(endFrontmatter + 3).trim();
        }
      }

      // Calculate reading time
      const readingTime = calculateReadingTime(markdown);

      // Populate Header Info
      document.getElementById("post-header-title").textContent = post.title;
      document.getElementById("post-header-date").textContent = formatDate(post.date);
      document.getElementById("post-header-reading-time").textContent = `${readingTime} min read`;

      if (post.series) {
        const seriesEl = document.getElementById("post-header-series");
        if (seriesEl) {
          seriesEl.textContent = post.series;
          seriesEl.style.display = "inline-flex";
        }
      }

      // Populate Tags
      const tagsContainer = document.getElementById("post-header-tags");
      if (tagsContainer && Array.isArray(post.tags)) {
        tagsContainer.innerHTML = post.tags
          .map((t) => `<a href="./blog.html?tag=${encodeURIComponent(t)}" class="tag-badge">#${t}</a>`)
          .join("");
      }

      // Cover image
      const coverContainer = document.getElementById("post-cover-container");
      const coverImg = document.getElementById("post-cover-img");
      if (post.cover && coverContainer && coverImg) {
        // Resolve relative cover path
        const coverSrc = post.cover.startsWith("http")
          ? post.cover
          : post.cover.startsWith("./") || post.cover.startsWith("blogs/")
          ? post.cover
          : `./blogs/${slug}/${post.cover}`;
        coverImg.src = coverSrc;
        coverImg.alt = post.title;
        coverContainer.style.display = "block";
      }

      // Configure marked renderer
      const renderer = new marked.Renderer();

      // Heading renderer with anchor link
      renderer.heading = function (text, level) {
        const plainText = text.replace(/<[^>]*>/g, "");
        const id = plainText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        if (level === 2 || level === 3 || level === 4) {
          return `
            <h${level} id="${id}">
              <a href="#${id}" class="heading-anchor" aria-label="Link to section">#</a>
              <span>${text}</span>
            </h${level}>
          `;
        }
        return `<h${level}>${text}</h${level}>`;
      };

      // Image renderer with path rewrite & figure wrapper
      renderer.image = function (href, title, text) {
        let cleanHref = href;
        if (!href.startsWith("http") && !href.startsWith("/") && !href.startsWith("data:")) {
          cleanHref = `./blogs/${slug}/${href}`;
        }
        const titleAttr = title ? `title="${title}"` : "";
        const caption = title || text;
        return `
          <figure>
            <img src="${cleanHref}" alt="${text || ""}" ${titleAttr} loading="lazy" />
            ${caption ? `<figcaption>${caption}</figcaption>` : ""}
          </figure>
        `;
      };

      // Table renderer with wrapper for horizontal scrolling
      renderer.table = function (header, body) {
        return `
          <div class="table-wrapper">
            <table>
              <thead>${header}</thead>
              <tbody>${body}</tbody>
            </table>
          </div>
        `;
      };

      // Code block renderer with syntax highlighting, title, and copy button
      renderer.code = function (code, infostring) {
        const info = (infostring || "").trim();

        // Check if this is a Mermaid diagram
        if (info.toLowerCase() === "mermaid") {
          return `<div class="mermaid-container"><pre class="mermaid">${code}</pre></div>`;
        }

        // Parse optional title: python title="main.py"
        let lang = "";
        let filename = "";
        const titleMatch = info.match(/title=["']([^"']+)["']/);
        if (titleMatch) {
          filename = titleMatch[1];
          lang = info.replace(titleMatch[0], "").trim();
        } else {
          const parts = info.split(/\s+/);
          lang = parts[0] || "";
        }

        // Syntax highlighting
        let highlighted = "";
        if (window.hljs && lang && window.hljs.getLanguage(lang)) {
          try {
            highlighted = window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
          } catch (e) {
            highlighted = DOMPurify.sanitize(code);
          }
        } else if (window.hljs) {
          try {
            highlighted = window.hljs.highlightAuto(code).value;
          } catch (e) {
            highlighted = DOMPurify.sanitize(code);
          }
        } else {
          highlighted = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }

        const langDisplay = lang ? lang.toUpperCase() : "TEXT";

        return `
          <div class="code-block-wrapper">
            <div class="code-block-header">
              <span class="code-block-title">
                ${filename ? `<span>${filename}</span>` : `<span class="code-block-lang">${langDisplay}</span>`}
              </span>
              <button type="button" class="code-copy-btn" aria-label="Copy code">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </button>
            </div>
            <pre><code class="hljs ${lang ? `language-${lang}` : ""}">${highlighted}</code></pre>
          </div>
        `;
      };

      marked.setOptions({
        renderer: renderer,
        gfm: true,
        breaks: false
      });

      // Step 1: Protect code blocks before extracting math formulas
      const codePlaceholders = [];
      let processedMarkdown = markdown.replace(/(```[\s\S]*?```)/g, (match) => {
        const token = `%%CODE_BLOCK_${codePlaceholders.length}%%`;
        codePlaceholders.push(match);
        return token;
      });
      processedMarkdown = processedMarkdown.replace(/(`[^`\n]+?`)/g, (match) => {
        const token = `%%CODE_BLOCK_${codePlaceholders.length}%%`;
        codePlaceholders.push(match);
        return token;
      });

      // Step 2: Extract LaTeX math blocks
      const mathBlocks = [];
      // Display math: $$ ... $$
      processedMarkdown = processedMarkdown.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        const token = `%%MATH_DISPLAY_${mathBlocks.length}%%`;
        mathBlocks.push({ formula: formula.trim(), display: true });
        return token;
      });

      // Inline math: $ ... $
      processedMarkdown = processedMarkdown.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, formula) => {
        const token = `%%MATH_INLINE_${mathBlocks.length}%%`;
        mathBlocks.push({ formula: formula.trim(), display: false });
        return token;
      });

      // Step 3: Restore code blocks intact
      codePlaceholders.forEach((code, idx) => {
        processedMarkdown = processedMarkdown.replace(`%%CODE_BLOCK_${idx}%%`, code);
      });

      // Step 4: Parse markdown to HTML
      let html = marked.parse(processedMarkdown);

      // Transform GitHub style callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CAUTION]
      html = html.replace(
        /<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](?:\s*<br>|\s*\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
        function (match, type, content) {
          const lowerType = type.toLowerCase();
          const icons = {
            note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
            tip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            important: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
            caution: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
          };

          return `
            <div class="callout callout-${lowerType}">
              <div class="callout-header">
                ${icons[lowerType] || ""}
                <span>${type}</span>
              </div>
              <p>${content}</p>
            </div>
          `;
        }
      );

      // Sanitize with DOMPurify
      const cleanHtml = DOMPurify.sanitize(html, {
        ADD_ATTR: ["target", "loading"],
        ADD_TAGS: ["svg", "line", "circle", "path", "polygon", "rect"]
      });

      // Step 5: Substitute KaTeX mathematical typesetting
      let finalHtml = cleanHtml;
      mathBlocks.forEach((item, idx) => {
        const pattern = item.display ? `%%MATH_DISPLAY_${idx}%%` : `%%MATH_INLINE_${idx}%%`;
        let rendered = "";
        if (window.katex) {
          try {
            rendered = window.katex.renderToString(item.formula, {
              displayMode: item.display,
              throwOnError: false
            });
          } catch (err) {
            console.warn("KaTeX render error:", err);
            rendered = item.display ? `$$\n${item.formula}\n$$` : `$${item.formula}$`;
          }
        } else {
          rendered = item.display ? `$$\n${item.formula}\n$$` : `$${item.formula}$`;
        }
        finalHtml = finalHtml.split(pattern).join(rendered);
      });

      // Inject into DOM
      articleContainer.innerHTML = finalHtml;

      // Attach copy button listeners
      articleContainer.querySelectorAll(".code-copy-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pre = btn.closest(".code-block-wrapper").querySelector("pre code");
          if (pre) {
            navigator.clipboard.writeText(pre.textContent).then(() => {
              btn.classList.add("copied");
              btn.querySelector("span").textContent = "Copied!";
              setTimeout(() => {
                btn.classList.remove("copied");
                btn.querySelector("span").textContent = "Copy";
              }, 2000);
            });
          }
        });
      });

      // Generate Table of Contents
      if (window.initTOC) {
        window.initTOC();
      }

      // Check and render Mermaid if present
      await loadAndRenderMermaid();

      // Configure "Edit on GitHub" link
      const editOnGithubLink = document.getElementById("edit-on-github-link");
      if (editOnGithubLink) {
        const repoUrl = window.SITE_CONFIG?.repoUrl || "https://github.com/KALI-THE-HACKER/blogs";
        const branch = window.SITE_CONFIG?.repoBranch || "main";
        editOnGithubLink.href = `${repoUrl}/edit/${branch}/blogs/${slug}/post.md`;
      }

      // Configure Share buttons
      const copyLinkBtn = document.getElementById("share-copy-link-btn");
      if (copyLinkBtn) {
        copyLinkBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(window.location.href).then(() => {
            showToast("Article link copied to clipboard");
          });
        });
      }

      const twitterShareBtn = document.getElementById("share-twitter-btn");
      if (twitterShareBtn) {
        const tweetText = encodeURIComponent(`"${post.title}" by @luckylinux`);
        const tweetUrl = encodeURIComponent(window.location.href);
        twitterShareBtn.href = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;
      }

      // Setup Prev / Next navigation
      // Note: posts are listed newest first (index 0 is newest)
      const prevPost = postIndex < posts.length - 1 ? posts[postIndex + 1] : null; // Older
      const nextPost = postIndex > 0 ? posts[postIndex - 1] : null; // Newer

      const prevNextNav = document.getElementById("prev-next-nav");
      if (prevNextNav) {
        let navHtml = "";
        if (prevPost) {
          navHtml += `
            <a href="./post.html?slug=${prevPost.slug}" class="prev-next-card prev">
              <span class="prev-next-label">← Previous Post</span>
              <span class="prev-next-title">${prevPost.title}</span>
            </a>
          `;
        } else {
          navHtml += `<div></div>`;
        }

        if (nextPost) {
          navHtml += `
            <a href="./post.html?slug=${nextPost.slug}" class="prev-next-card next">
              <span class="prev-next-label">Next Post →</span>
              <span class="prev-next-title">${nextPost.title}</span>
            </a>
          `;
        }

        prevNextNav.innerHTML = navHtml;
      }

      // Update meta tags and title
      updateMetaTags(post);

      // Hide loading spinner, show content
      if (loadingContainer) loadingContainer.style.display = "none";
      articleContainer.style.display = "block";
    } catch (error) {
      console.error("Error loading post:", error);
      if (loadingContainer) loadingContainer.style.display = "none";
      if (errorContainer) errorContainer.style.display = "block";
    }
  }

  document.addEventListener("DOMContentLoaded", initPost);
})();
