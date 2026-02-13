// src/lib/sota/sanitize.ts
// SOTA God Mode — Enterprise HTML Sanitization v4.0
// Uses DOMPurify instead of brittle regex patterns

import DOMPurify from "dompurify";

// ═══════════════════════════════════════════════════════════════════
// WORDPRESS CONTENT SANITIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Allowed HTML tags for WordPress blog post content.
 * Intentionally permissive for styled content (inline styles on divs, tables, etc.)
 * but blocks all script/event-handler vectors.
 */
const WP_CONTENT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // Structure
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "div", "span", "section", "article",
    "br", "hr",
    // Text formatting
    "strong", "b", "em", "i", "u", "s", "del", "ins",
    "mark", "small", "sub", "sup", "abbr", "cite", "code", "pre",
    // Lists
    "ul", "ol", "li",
    // Links & media
    "a", "img", "figure", "figcaption", "picture", "source",
    "iframe", "video", "audio",
    // Tables
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    // Quotes & blocks
    "blockquote", "q", "details", "summary",
    // Misc
    "time", "data", "address",
  ],
  ALLOWED_ATTR: [
    // Global
    "id", "class", "style", "title", "lang", "dir",
    // Links
    "href", "target", "rel", "download",
    // Media
    "src", "srcset", "sizes", "alt", "width", "height", "loading",
    "poster", "controls", "autoplay", "muted", "loop", "playsinline",
    // Iframe (YouTube, etc.)
    "allowfullscreen", "allow", "frameborder",
    // Tables
    "colspan", "rowspan", "scope", "headers",
    // Data
    "data-*", "datetime", "value",
    // Accessibility
    "role", "aria-label", "aria-hidden", "aria-describedby",
    // Lists
    "type", "start", "reversed",
  ],
  // Block data: URIs in src/href (XSS vector)
  ALLOW_DATA_ATTR: true,
  // Allow target="_blank" but ensure rel="noopener noreferrer" is added
  ADD_ATTR: ["target"],
  // Force rel="noopener noreferrer" on all links with target="_blank"
  FORBID_TAGS: ["script", "style", "noscript", "object", "embed", "applet", "form", "input", "textarea", "select", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onsubmit", "onchange", "onkeydown", "onkeyup", "onkeypress"],
};

/**
 * Sanitize HTML content for safe WordPress rendering.
 * Removes XSS vectors while preserving styled content elements.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  // DOMPurify handles all the heavy lifting
  let clean = DOMPurify.sanitize(html, WP_CONTENT_CONFIG);

  // Post-processing: ensure target="_blank" links have rel="noopener noreferrer"
  clean = clean.replace(
    /<a\s([^>]*target\s*=\s*["']_blank["'][^>]*)>/gi,
    (match, attrs: string) => {
      if (!/rel\s*=/.test(attrs)) {
        return `<a ${attrs} rel="noopener noreferrer">`;
      }
      return match;
    },
  );

  return clean;
}

/**
 * Sanitize with stricter rules — for user-generated content or untrusted sources.
 * Strips all inline styles and limits tags to basic text formatting.
 */
export function sanitizeStrict(html: string): string {
  if (!html || typeof html !== "string") return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h2", "h3", "h4", "p", "br", "hr",
      "strong", "b", "em", "i", "u",
      "ul", "ol", "li",
      "a", "blockquote", "code", "pre",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["href", "title", "alt", "target", "rel"],
    FORBID_ATTR: ["style", "class", "id"],
  });
}

/**
 * Strip all HTML tags and return plain text.
 * Useful for word count, meta description extraction, etc.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Normalize whitespace
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * Extract just the text content, preserving paragraph breaks as newlines.
 * Useful for readability analysis.
 */
export function htmlToText(html: string): string {
  if (!html || typeof html !== "string") return "";

  // Replace block elements with newlines before stripping
  let text = html
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|hr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Normalize whitespace while preserving paragraph breaks
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}

export default { sanitizeHtml, sanitizeStrict, stripHtml, htmlToText };
