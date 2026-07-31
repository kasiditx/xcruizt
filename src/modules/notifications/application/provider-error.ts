export class NotificationProviderError extends Error {
  constructor(
    readonly code:
      | "email_provider_rejected"
      | "email_provider_unavailable",
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "NotificationProviderError";
  }
}
