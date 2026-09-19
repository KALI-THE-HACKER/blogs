# luckylinux — Engineering Notes

Static technical engineering publication by Lucky Verma ([luckylinux.dev](https://luckylinux.dev)), built with pure HTML, CSS, and vanilla JavaScript without frameworks or build steps. Deploys directly to GitHub Pages and supports `blog.luckylinux.dev`.

## Local Development

Start a local HTTP server to preview posts, markdown rendering, and search:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Adding a New Post

1. **Create directory**: `blogs/<slug>/`
2. **Add article & cover**:
   - `blogs/<slug>/post.md` (supports GFM, LaTeX math with KaTeX, Mermaid diagrams, and callouts)
   - `blogs/<slug>/cover.png` (or `.svg`)
3. **Register in manifest**: Add an entry to [blogs/posts.json](blogs/posts.json):
   ```json
   {
     "slug": "your-post-slug",
     "title": "Your Post Title",
     "date": "2026-10-01",
     "excerpt": "Short summary of the article.",
     "tags": ["backend", "docker", "networking"],
     "series": "Optional Series Name",
     "cover": "cover.png",
     "readingTime": 6,
     "draft": false
   }
   ```
4. **Regenerate RSS & Sitemap**:
   ```bash
   node scripts/generate-feed.mjs
   ```

## GitHub Pages & Custom Domain Setup

- **GitHub Pages**: Go to **Settings** → **Pages** → Source: **Deploy from a branch** (`main` / `/ (root)`).
- **Custom Domain**: The repository includes a `CNAME` file configured for `blog.luckylinux.dev`. Point a DNS `CNAME` record in Cloudflare from `blog` to `<your-username>.github.io`.

## Configuration

Site metadata, author links, Plausible analytics, and optional visitor counters are managed in [js/config.js](js/config.js).
