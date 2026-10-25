export const DEFAULT_SITE_URL = "https://skillmitraindonesia.com";

const legacyHosts = new Set([
  "skilltestindonesia.com",
  "tokopediakaririndonesia.onrender.com",
]);

export function getPublicSiteUrl(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return DEFAULT_SITE_URL;

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    if (legacyHosts.has(new URL(normalized).hostname.toLowerCase())) {
      return DEFAULT_SITE_URL;
    }
  } catch {
    // Preserve the existing URL value so the settings form can be corrected.
  }

  return normalized.replace(/\/+$/, "");
}
