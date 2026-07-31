import type { ErrorEvent } from "@sentry/nextjs";

const sensitiveKey =
  /(?:authorization|cookie|email|password|secret|token|signed.?url)$/i;

function stripQueryAndFragment(value: string | undefined) {
  if (!value) return value;

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const request = event.request
    ? {
        ...event.request,
        cookies: undefined,
        data: undefined,
        headers: undefined,
        query_string: undefined,
        url: stripQueryAndFragment(event.request.url),
      }
    : undefined;
  const tags = event.tags
    ? Object.fromEntries(
        Object.entries(event.tags).filter(([key]) => !sensitiveKey.test(key)),
      )
    : undefined;

  return {
    ...event,
    breadcrumbs: event.breadcrumbs?.map((breadcrumb) => ({
      ...breadcrumb,
      data: undefined,
    })),
    extra: undefined,
    request,
    tags,
    user: event.user?.id ? { id: String(event.user.id) } : undefined,
  };
}
