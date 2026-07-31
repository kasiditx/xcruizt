export function resolvePublicMediaSource(
  candidate: string,
  siteUrl: string,
  mediaOrigin?: string,
): string | null {
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }

  try {
    const source = new URL(candidate);
    if (
      source.protocol !== "https:" ||
      source.username ||
      source.password
    ) {
      return null;
    }

    const site = new URL(siteUrl);
    if (source.origin === site.origin) {
      return `${source.pathname}${source.search}`;
    }

    if (mediaOrigin && source.origin === new URL(mediaOrigin).origin) {
      return source.toString();
    }
  } catch {
    return null;
  }

  return null;
}
