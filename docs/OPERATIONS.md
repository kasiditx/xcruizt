# XCRUIZT Operations Runbook

This runbook covers the implemented Commerce MVP operational surfaces. It does
not contain credentials. Run provider and database actions only against the
intended environment and retain an audit trail for every manual Admin change.

## Non-negotiable invariants

- Stripe Checkout redirects are not payment proof. Only a verified Stripe
  webhook may fulfill an Order.
- A paid Order, Payment, Entitlements, and outbox records are committed
  atomically. Email and Discord failures must not reverse a paid Order.
- Entitlement is the ownership authority. Discord roles are never ownership
  proof.
- Never log or paste raw webhook bodies, access tokens, passwords, storage
  keys, personal data, or full signed download URLs into tickets or chat.
- Do not manually grant ownership before validating the Order, Payment,
  currency, amount, Stripe environment, and existing Entitlements.

## Deployment sequence

1. Review the release diff, migrations, `.env.example`, and dependency audit.
2. Confirm environment separation for Supabase, Stripe, R2, Discord, Upstash,
   QStash, Resend, Turnstile, and Sentry.
3. Run the repository gates:

   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm audit --prod --audit-level high
   ```

4. Back up the target database when the migration risk requires it, then apply
   reviewed migrations:

   ```bash
   pnpm db:migrate
   pnpm db:seed:authorization
   ```

5. Deploy the application without exposing server-only environment variables
   to the browser or build logs.
6. Verify `GET /api/health` and `GET /api/ready`. Health proves the process can
   answer; readiness additionally proves the database connection and required
   staging/production provider configuration.
7. Run the production smoke checklist below. Use designated test accounts and
   provider test modes in staging; never create fake production commerce data.

## Monitoring surfaces

- `/api/health`: shallow liveness, no provider calls.
- `/api/ready`: configuration and database readiness; returns a generic 503
  error without revealing which credential is absent.
- `/admin`: operational counts and navigation.
- `/admin/orders`, `/admin/payments`, `/admin/refunds`.
- `/admin/entitlements`, `/admin/downloads`.
- `/admin/webhooks`, `/admin/audit-logs`.
- `/admin/discord` and `/admin/mfa`.
- Structured JSON server logs use event names and request IDs without raw PII
  or secrets.
- Sentry captures server/client exceptions only when its DSN is configured.
  Verify a real event and source-map upload in each deployed environment before
  treating error monitoring as operational.

## Paid Order does not appear in Library

1. Locate the Order in `/admin/orders` by the customer-provided Order Number.
2. Check `/admin/payments` and the corresponding event in `/admin/webhooks`.
3. Confirm Stripe reports the expected account/mode, successful payment status,
   THB currency, amount, Checkout Session, and Order metadata.
4. Check whether the webhook is processed, ignored, failed, or still pending.
5. Check `/admin/entitlements` for every Product granted by the purchased SKU.
6. If Stripe delivery failed, replay the original event from Stripe Dashboard
   to `/api/webhooks/stripe`. The handler is designed to deduplicate provider
   event IDs and make fulfillment idempotent.
7. Confirm the Order, Payment, Entitlements, and outbox state after replay.
8. Confirm the customer Library with the affected account and record any Admin
   intervention in the audit log.

Do not grant an Entitlement merely because the customer shows a success page or
payment screenshot. If compensation is approved as a business exception, use
the authorized Admin flow and preserve the audit record.

## Download fails

1. Confirm the customer session and active customer status.
2. Confirm an active Entitlement for the requested Product.
3. Confirm the Product has a published current Product Version.
4. Confirm the requested file is active and belongs to that Product Version.
5. Confirm the private R2 object exists without copying its storage key into
   user-facing logs or tickets.
6. Check `/admin/downloads` for authorization, rate-limit, and provider failure
   outcomes.
7. Confirm Upstash and R2 readiness, then request a new short-lived URL through
   the normal Library flow. Never reuse or email a full signed URL.
8. If abuse is suspected, preserve evidence and follow the file-leak procedure
   before suspending an account or revoking access.

## Discord role is missing

1. Confirm the website account is still usable and the Library Entitlements are
   correct. Discord must not block ownership.
2. Check `/account/discord` and `/admin/discord` for link and sync state.
3. Confirm guild membership, Bot permissions, role hierarchy, and the stored
   Product-to-role mapping.
4. Trigger the normal resync flow. It is rate-limited and queued.
5. Inspect signed `/api/jobs/discord` deliveries and structured Discord error
   events. Do not call the job route manually without a valid QStash signature.
6. Retry after the provider recovers. Do not revoke a valid Entitlement because
   Discord is unavailable.

## Notification or outbox backlog

1. Confirm the paid Order and Entitlements are already committed.
2. Inspect the operational dashboard, QStash delivery history, and structured
   notification events.
3. Confirm Resend configuration and sender-domain verification.
4. Allow bounded retry/backoff to run through signed
   `/api/jobs/notifications` deliveries.
5. Retry only the affected outbox event through the approved worker mechanism.
   Never resend by replaying the payment transaction.

## Stripe webhook failures

1. Check that the request reached `/api/webhooks/stripe` with the raw body and
   `Stripe-Signature` intact.
2. Confirm the webhook secret belongs to the current Stripe account and mode.
3. Use the request ID to correlate structured logs and Sentry without copying
   the payload.
4. Check database readiness and the event state in `/admin/webhooks`.
5. Replay the original provider event after the root cause is fixed.
6. Verify one processed event, one paid Order, the expected Entitlements, and no
   duplicate outbox work after repeated delivery.

## Provider outage behavior

- Database unavailable: readiness returns 503 and state-changing operations
  must fail without claiming success.
- Stripe unavailable: catalog remains readable; new Checkout Session creation
  returns a safe provider error and grants nothing.
- R2 unavailable: ownership remains intact; download URL creation fails safely.
- Upstash unavailable outside local: protected high-risk operations fail closed
  rather than bypass rate limits.
- QStash, Resend, or Discord unavailable: paid fulfillment remains valid;
  retryable side effects remain queued or failed for later recovery.
- Turnstile unavailable outside local: password authentication fails closed.
- Sentry or Speed Insights unavailable: application behavior must continue;
  structured application logs and health checks remain the fallback.

## Suspected product-file leak

1. Preserve download-event evidence and identify the affected Product Version.
2. Do not accuse or suspend a customer without evidence and the applicable
   policy approval.
3. Disable the affected file/version when containment is necessary.
4. Rotate the object key or publish a replacement package through the normal
   Admin workflow.
5. Re-check active Entitlements and download behavior.
6. Record containment, evidence, decisions, and restoration in the audit and
   incident records.

## Secret leak

1. Revoke and rotate the affected provider credential immediately.
2. Replace it in the secret manager and redeploy the affected environment.
3. Audit provider, deployment, CI, and application logs for misuse without
   redistributing the leaked value.
4. Remove leaked material from Git history only with an approved, coordinated
   recovery plan.
5. Reset sessions if an authentication/session secret was exposed.
6. Verify readiness, provider callbacks, queues, downloads, and monitoring with
   the replacement credential.
7. Record scope, timeline, impact, and follow-up actions.

## Rollback

1. Stop the rollout if readiness, migrations, authorization, payment
   validation, or download controls regress.
2. Prefer an application rollback to the last known-good release when the
   migration is backward compatible.
3. Do not reverse a database migration blindly. Use a reviewed forward fix or
   a tested restore plan when data shape changed.
4. Keep Stripe webhooks retryable during the incident; do not acknowledge an
   event as processed unless its database transaction committed.
5. Re-run readiness and the production smoke checklist after recovery.

## Production smoke checklist

- Health and readiness return success over HTTPS.
- HSTS and the configured security headers are present in production.
- Username/password login, logout, session persistence, and Admin MFA work.
- A normal customer is denied every Admin page, action, and API operation.
- Homepage, Shop, Collection, Product, Cart, and account pages render on mobile
  and desktop without console errors or horizontal overflow.
- A staging/test-mode PromptPay Checkout completes through a verified webhook;
  repeating the event does not duplicate fulfillment.
- The paid Product appears in Library and a private file downloads through a
  short-lived URL; unauthorized and cross-user requests are denied.
- Refund/revoke behavior preserves ownership granted by another valid source.
- Notification and Discord failures do not remove Library access.
- Sentry receives a scrubbed test exception and Speed Insights begins reporting
  only after a supported production deployment is active.
