import sanitizeHtml from "sanitize-html";

/**
 * Defense-in-depth: sanitize at storage time in case content is ever
 * rendered in a non-React context (emails, Telegram, RSS, mobile app).
 */

/** Permissive config for blog post body content. */
const BLOG_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "a", "strong", "em", "b", "i", "u",
    "blockquote", "pre", "code", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "hr", "span", "div", "figure", "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    span: ["class"],
    div: ["class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  // Strip all event handlers by default (sanitize-html does this)
  // Disallow script, iframe, object, embed, form, input
};

/** Restrictive config for site content values (basic text formatting only). */
const SITE_CONTENT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "b", "i", "a"],
  allowedAttributes: {
    a: ["href"],
  },
};

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, BLOG_SANITIZE_OPTIONS);
}

export function sanitizeSiteContent(value: string): string {
  return sanitizeHtml(value, SITE_CONTENT_SANITIZE_OPTIONS);
}
