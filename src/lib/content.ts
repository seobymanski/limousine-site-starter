/**
 * Tiny markdown + frontmatter loader for static page bodies.
 *
 * The seo-writer agent drops `.md` files into `src/data/content/` with a
 * front-matter block (title, description, h1, heroSubhead, ogImage) followed
 * by markdown body. We render the body to HTML using a small
 * built-in renderer so we don't have to ship a markdown parser to the worker.
 *
 * Astro's `import.meta.glob` is used at build/SSR time so the markdown is
 * inlined into the bundle.
 */

export interface PageContent {
  frontmatter: {
    title: string;
    description: string;
    h1: string;
    heroSubhead: string;
    ogImage?: string;
  };
  bodyMarkdown: string;
  bodyHtml: string;
}

const allFiles = import.meta.glob<string>(
  '../data/content/*.md',
  { query: '?raw', import: 'default', eager: true },
);

function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { fm: {}, body: raw };
  const fm: Record<string, string> = {};
  const fmBlock = match[1] ?? '';
  const body = match[2] ?? '';
  for (const line of fmBlock.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fm[key] = value;
  }
  return { fm, body };
}

/* ------------------------------------------------------------------ */
/* Minimal markdown -> HTML                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(text: string): string {
  let s = text;
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const isExternal = /^https?:\/\//.test(u) && !u.includes('example.com');
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(u)}"${attrs}>${escapeHtml(t)}</a>`;
  });
  // Bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text* (not inside word boundaries)
  s = s.replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  let inList: 'ul' | 'ol' | null = null;
  let inPara: string[] = [];

  const flushPara = () => {
    if (inPara.length) {
      out.push(`<p>${inline(inPara.join(' ').trim())}</p>`);
      inPara = [];
    }
  };
  const flushList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trim();

    if (!line) {
      flushPara();
      flushList();
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      const level = h[1]!.length;
      out.push(`<h${level}>${inline(escapeHtmlButKeepInline(h[2]!))}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      flushPara();
      flushList();
      out.push('<hr />');
      i++;
      continue;
    }

    // Unordered list
    const ulm = line.match(/^[-*]\s+(.*)$/);
    if (ulm) {
      flushPara();
      if (inList !== 'ul') {
        flushList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inline(escapeHtmlButKeepInline(ulm[1]!))}</li>`);
      i++;
      continue;
    }

    // Ordered list
    const olm = line.match(/^\d+\.\s+(.*)$/);
    if (olm) {
      flushPara();
      if (inList !== 'ol') {
        flushList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inline(escapeHtmlButKeepInline(olm[1]!))}</li>`);
      i++;
      continue;
    }

    // Blockquote
    const bq = line.match(/^>\s+(.*)$/);
    if (bq) {
      flushPara();
      flushList();
      out.push(`<blockquote><p>${inline(escapeHtmlButKeepInline(bq[1]!))}</p></blockquote>`);
      i++;
      continue;
    }

    // Plain paragraph line (gather)
    flushList();
    inPara.push(escapeHtmlButKeepInline(line));
    i++;
  }
  flushPara();
  flushList();

  return out.join('\n');
}

/** Escape HTML but preserve the markdown syntax that `inline()` handles. */
function escapeHtmlButKeepInline(s: string): string {
  // Escape & < > " ' but NOT the markdown markers; inline() expects raw
  // characters for **, *, [, ], (, ), ` so we must not double-escape them.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

export function loadPageContent(slug: string): PageContent | null {
  const key = `../data/content/${slug}.md`;
  const raw = allFiles[key];
  if (!raw) return null;
  const { fm, body } = parseFrontmatter(raw);
  return {
    frontmatter: {
      title: fm.title || '',
      description: fm.description || '',
      h1: fm.h1 || fm.title || '',
      heroSubhead: fm.heroSubhead || fm.description || '',
      ogImage: fm.ogImage,
    },
    bodyMarkdown: body,
    bodyHtml: renderMarkdown(body),
  };
}
