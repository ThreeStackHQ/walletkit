/**
 * Escape HTML special characters to prevent XSS when inserting text into HTML.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Escape characters that have special meaning inside HTML attribute values.
 */
export function escapeAttr(str: string): string {
  return str.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
