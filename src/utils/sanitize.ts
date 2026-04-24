import DOMPurify from 'dompurify';

/**
 * Sanitize a text input: strip all HTML tags, trim whitespace.
 * Use for user-entered names, notes, search terms, etc.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  // Strip all HTML tags and decode entities
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Also strip any remaining < > to be safe
  return cleaned.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize HTML content: allow safe tags only (for rich text display).
 * Use for email templates, signatures, etc.
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Escape special characters in search queries to prevent regex/SQL issues.
 */
export function escapeSearchQuery(query: string): string {
  if (!query) return '';
  return sanitizeText(query)
    .replace(/[%_\\]/g, '\\$&')   // Escape SQL wildcards
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
}

/**
 * Validate and sanitize a filename.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._\-\s]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

/**
 * Sanitize an object's string values (for form submissions).
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  for (const key in result) {
    if (typeof result[key] === 'string') {
      (result as any)[key] = sanitizeText(result[key] as string);
    }
  }
  return result;
}
