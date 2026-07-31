export class DiscordProviderError extends Error {
  constructor(
    readonly code:
      | "invalid_response"
      | "member_not_found"
      | "network_error"
      | "permission_denied"
      | "rate_limited"
      | "server_error",
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
  ) {
    super(code);
    this.name = "DiscordProviderError";
  }
}
