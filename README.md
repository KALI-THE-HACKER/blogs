# luckylinux — Technical Engineering Blog

A quiet, high-end, editorial static engineering publication built with **pure HTML, CSS, and vanilla JavaScript**. No frameworks, no bundlers, and no build step required. Deploys directly to **GitHub Pages** from raw static files and supports custom subdomains (e.g., `blog.luckylinux.dev`).

---

## Table of Contents

1. [Local Development](#local-development)
2. [How to Add a New Post (3 Steps)](#how-to-add-a-new-post-3-steps)
3. [Deploying to GitHub Pages](#deploying-to-github-pages)
4. [Custom Domain Setup (`blog.luckylinux.dev`)](#custom-domain-setup-blogluckylinuxdev)
5. [Visitor Counter & Analytics](#visitor-counter--analytics)
   - [Option A: Plausible + Cloudflare Worker Proxy (Recommended)](#option-a-plausible--cloudflare-worker-proxy-recommended)
   - [Option B: GoatCounter Zero-Setup Fallback (2 Minutes)](#option-b-goatcounter-zero-setup-fallback-2-minutes)
   - [Option C: Disabling the Counter](#option-c-disabling-the-counter)
6. [Design System & Theming](#design-system--theming)
7. [RSS Feed & Sitemap Generator](#rss-feed--sitemap-generator)
8. [Directory Structure](#directory-structure)

---

## Local Development

Browsers block cross-origin `fetch()` requests to local `file://` URLs for security. To preview the blog locally with Markdown parsing and JSON manifest loading, run a lightweight local HTTP server:

```bash
# From the root directory:
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## How to Add a New Post (3 Steps)

### Step 1: Create the Post Folder
Inside the `blogs/` directory, create a new folder named after your post's URL slug:
```bash
mkdir -p blogs/distributed-consensus-raft/images
```

### Step 2: Add `post.md` and Assets
Create `blogs/distributed-consensus-raft/post.md`. You can write standard GitHub-flavored Markdown, including:
- **Callouts**: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!CAUTION]`
- **Code Blocks**: ````python title="server.py"`
- **Mermaid Diagrams**: ````mermaid` blocks (lazy-loaded on demand and theme-reactive)
- **Images**: Reference local images with relative paths `images/diagram.png` (the renderer automatically rewrites them)
- **Cover**: Add an SVG or PNG cover image (e.g. `blogs/distributed-consensus-raft/cover.svg`)

### Step 3: Register the Post in `blogs/posts.json`
Add an entry to the top of `blogs/posts.json`:
```json
{
  "slug": "distributed-consensus-raft",
  "title": "Implementing Leader Election in Raft with Python",
  "date": "2026-10-01",
  "excerpt": "A deep dive into state machines, randomized election timeouts, and RPC serialization in distributed consensus.",
  "tags": ["distributed-systems", "python", "networking", "consensus"],
  "series": "Distributed Systems Internals",
  "cover": "cover.svg",
  "readingTime": 9,
  "draft": false
}
```

*Note: Once added, regenerate the RSS feed and sitemap by running `node scripts/generate-feed.mjs`.*

---

## Deploying to GitHub Pages

Because this site requires no build step, you can push directly to GitHub and deploy in seconds:

1. Create a GitHub repository (e.g. `https://github.com/KALI-THE-HACKER/blogs`).
2. Push your files to the `main` branch:
   ```bash
   git add .
   git commit -m "feat: initial release of luckylinux engineering blog"
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
4. GitHub Pages will build and deploy your site within 60 seconds at `https://<username>.github.io/<repo>/`.

---

## Custom Domain Setup (`blog.luckylinux.dev`)

To serve the blog from `blog.luckylinux.dev`:

1. **CNAME File**:
   This repository contains a `CNAME` file in the root directory containing:
   ```
   blog.luckylinux.dev
   ```
2. **DNS Configuration (Cloudflare DNS)**:
   In your Cloudflare dashboard for `luckylinux.dev`, add a **CNAME** DNS record:
   - **Type**: `CNAME`
   - **Name**: `blog`
   - **Target**: `KALI-THE-HACKER.github.io`
   - **Proxy status**: Proxied (Orange cloud) or DNS-only (Grey cloud)
3. **GitHub Pages Custom Domain**:
   In your repository under **Settings** → **Pages** → **Custom domain**, verify that `blog.luckylinux.dev` is listed, and check **Enforce HTTPS** once the Let's Encrypt certificate is issued.

---

## Visitor Counter & Analytics

Site configuration is centralized in `js/config.js`.

### Option A: Plausible + Cloudflare Worker Proxy (Recommended)
This approach queries your self-hosted or cloud Plausible Analytics without ever exposing your private Plausible API token to clients.

1. Deploy the included Cloudflare Worker in `extras/plausible-counter-worker.js`:
   ```bash
   cd extras/
   npm install -g wrangler
   wrangler login
   wrangler secret put PLAUSIBLE_API_KEY
   wrangler deploy
   ```
2. In `js/config.js`, set:
   ```javascript
   counter: {
     provider: "worker",
     workerUrl: "https://plausible-counter.<your-subdomain>.workers.dev"
   }
   ```
3. To enable Plausible pageview tracking script, set:
   ```javascript
   analytics: {
     plausibleDomain: "blog.luckylinux.dev",
     plausibleScriptSrc: "https://plausible.luckylinux.dev/js/script.js"
   }
   ```

### Option B: GoatCounter Zero-Setup Fallback (2 Minutes)
If you want an instant zero-maintenance visitor counter:
1. Register a free account at [goatcounter.com](https://goatcounter.com) (e.g. `luckylinux-blog`).
2. In `js/config.js`, configure:
   ```javascript
   counter: {
     provider: "goatcounter",
     goatcounterCode: "luckylinux-blog"
   }
   ```

### Option C: Disabling the Counter
Set `provider: "none"` in `js/config.js`. The counter badge in the footer will cleanly hide itself without throwing any errors.

---

## Design System & Theming

- **Tokens & Variables**: Controlled in `css/base.css` via CSS custom properties.
- **Light Theme (Default)**: Cream background (`#FAF6EE`), high-contrast near-black text (`#1F1B16`), warm borders, and restrained terracotta accent (`#B4532A`).
- **Dark Theme**: Warm charcoal (`#141210`), surface (`#1E1B18`), soft cream text (`#EDE6D8`), and brightened terracotta accent (`#D96B3D`).
- **Zero-Flash Execution**: An inline script in `<head>` applies the saved or system-preferred theme before browser paint.
- **Typography Scale**:
  - Headings: `Fraunces` (tight tracking, fluid sizes with `clamp()`)
  - Body Prose: `Newsreader` (optical size 16-72, ~19px, line-height 1.78, 68ch max width)
  - UI & Metadata: `Inter`
  - Code & Callouts: `JetBrains Mono`

---

## RSS Feed & Sitemap Generator

To update `feed.xml` and `sitemap.xml` after adding or editing articles:

```bash
node scripts/generate-feed.mjs
```

This reads `blogs/posts.json` and writes standard-compliant RSS 2.0 and XML sitemaps automatically.

---

## Directory Structure

```
blogs/
├── index.html                   # Home page: hero, featured post, latest list, topic cloud
├── blog.html                    # All posts archive: search, tag chips, series grouping
├── post.html                    # Single post: dynamic markdown renderer, sticky TOC
├── about.html                   # About author and technical topic scope
├── 404.html                     # Custom styled 404 error page
├── CNAME                        # blog.luckylinux.dev
├── .nojekyll                    # Disables Jekyll processing on GitHub Pages
├── robots.txt                   # Search crawler directives
├── sitemap.xml                  # XML sitemap for search engines
├── feed.xml                     # RSS 2.0 feed
├── assets/
│   ├── favicon.svg              # Minimal terracotta 'l' monogram
│   └── og-image.svg             # Editorial OpenGraph social banner
├── css/
│   ├── base.css                 # CSS variables, typography, reset, paper-grain
│   ├── components.css           # Header, cards, chips, search, buttons, footer
│   └── markdown.css             # Prose typography, callouts, syntax code blocks, TOC
├── js/
│   ├── config.js                # Centralized site configuration & metadata
│   ├── theme.js                 # Theme switcher & storage persistence
│   ├── main.js                  # Mobile nav, scroll animations, reading progress
│   ├── blog.js                  # Search, tag filtering, series grouping
│   ├── post.js                  # Markdown parser, DOMPurify, highlight.js, Mermaid
│   ├── toc.js                   # Table of Contents generator & scroll-spy
│   └── counter.js               # Animated visitor counter with graceful fallback
├── blogs/
│   ├── posts.json               # Manifest of articles
│   ├── exposing-home-server-cloudflare-tunnel-nginx/
│   ├── protected-media-cloudflare-r2-django/
│   └── search-space-pruning-split-ticket-routing/
├── extras/
│   └── plausible-counter-worker.js  # Cloudflare Worker code for Plausible counter
└── scripts/
    └── generate-feed.mjs        # Script to generate feed.xml and sitemap.xml
```
