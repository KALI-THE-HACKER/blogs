/**
 * scripts/generate-feed.mjs
 * Generates RSS 2.0 feed (feed.xml) and Search Engine Sitemap (sitemap.xml)
 * directly from blogs/posts.json manifest.
 *
 * Usage:
 *   node scripts/generate-feed.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SITE_URL = 'https://blog.luckylinux.dev';
const SITE_TITLE = 'luckylinux — Engineering Notes';
const SITE_DESC = 'Notes on building, deploying, and debugging systems, backend infrastructure, and algorithms by Lucky Verma.';
const AUTHOR_EMAIL = 'lucky@luckylinux.dev';
const AUTHOR_NAME = 'Lucky Verma';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function generateRss(posts) {
  const latestDate = posts.length > 0 ? new Date(posts[0].date).toUTCString() : new Date().toUTCString();

  const itemsXml = posts
    .filter(p => !p.draft)
    .map(p => {
      const pubDate = new Date(p.date).toUTCString();
      const postUrl = `${SITE_URL}/post.html?slug=${p.slug}`;
      const categories = (p.tags || []).map(t => `<category>${escapeXml(t)}</category>`).join('\n      ');

      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      ${categories}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <managingEditor>${AUTHOR_EMAIL} (${AUTHOR_NAME})</managingEditor>
    <webMaster>${AUTHOR_EMAIL} (${AUTHOR_NAME})</webMaster>
${itemsXml}
  </channel>
</rss>
`;
}

function generateSitemap(posts) {
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly', lastmod: today },
    { loc: `${SITE_URL}/blog.html`, priority: '0.9', changefreq: 'daily', lastmod: today },
    { loc: `${SITE_URL}/about.html`, priority: '0.7', changefreq: 'monthly', lastmod: today }
  ];

  const postPages = posts
    .filter(p => !p.draft)
    .map(p => ({
      loc: `${SITE_URL}/post.html?slug=${p.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: p.updated || p.date
    }));

  const allPages = [...staticPages, ...postPages];

  const urlsXml = allPages
    .map(page => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
}

async function main() {
  const manifestPath = path.join(rootDir, 'blogs', 'posts.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: Could not find ${manifestPath}`);
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Generate feed.xml
  const rssXml = generateRss(posts);
  fs.writeFileSync(path.join(rootDir, 'feed.xml'), rssXml, 'utf8');
  console.log('✓ Generated feed.xml');

  // Generate sitemap.xml
  const sitemapXml = generateSitemap(posts);
  fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log('✓ Generated sitemap.xml');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
