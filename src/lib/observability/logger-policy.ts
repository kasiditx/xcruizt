export type LogValue = boolean | number | string | null | undefined;
export type LogContext = Record<string, LogValue>;

const blockedKeys =
  /(?:authorization|cookie|email|full.?name|ipaddress|password|phone|remoteip|secret|token|url|username)$/i;

export function redactLogContext(
  context: LogContext,
): Record<string, Exclude<LogValue, undefined>> {
  return Object.fromEntries(
    Object.entries(context).filter(
      ([key, value]) => value !== undefined && !blockedKeys.test(key),
    ),
  ) as Record<string, Exclude<LogValue, undefined>>;
}
