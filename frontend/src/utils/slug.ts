/**
 * Converts a product title into a URL-friendly slug.
 * Example: "Sony WH-1000XM5 Wireless Headphones" -> "sony-wh-1000xm5-wireless-headphones"
 */
export const generateProductSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Strip out special characters
    .replace(/[\s_-]+/g, '-') // Convert spaces and hyphens/underscores to a single dash
    .replace(/^-+|-+$/g, ''); // Trim dashes from edges
};
