"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getStripeEnvironment } from "@/lib/env/stripe";
import {
  logServerError,
  logServerWarning,
} from "@/lib/observability/logger";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";
import { parseFullRefundInput } from "@/modules/administration/application/refund-input";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import {
  findRefundablePayment,
  recordFullRefund,
} from "@/modules/administration/infrastructure/refund-repository";
import { createStripeFullRefund } from "@/modules/administration/infrastructure/stripe-refund";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export async function createFullRefundAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.refundPayment,
  );
  let refundRateLimit: Awaited<
    ReturnType<typeof consumeSecurityRateLimit>
  >;
  try {
    refundRateLimit = await consumeSecurityRateLimit(
      "admin_refund",
      [account.id],
    );
  } catch {
    logServerError("admin.refund_rate_limit_unavailable", {
      adminUserId: account.id,
    });
    redirect("/admin/refunds?notice=rate_limit_unavailable");
  }
  if (!refundRateLimit.allowed) {
    logServerWarning("admin.refund_rate_limited", {
      adminUserId: account.id,
    });
    redirect("/admin/refunds?notice=rate_limited");
  }

  const parsed = parseFullRefundInput({
    instructionsEmail: formData.get("instructionsEmail"),
    paymentId: formData.get("paymentId"),
    reason: formData.get("reason"),
    refundRequestId: formData.get("refundRequestId"),
  });
  if (!parsed.ok) {
    redirect("/admin/refunds?notice=invalid");
  }

  let environment: ReturnType<typeof getStripeEnvironment>;
  try {
    environment = getStripeEnvironment();
  } catch {
    redirect("/admin/refunds?notice=provider_unavailable");
  }

  const payment = await findRefundablePayment(parsed.value.paymentId);
  if (!payment) {
    redirect("/admin/refunds?notice=not_refundable");
  }

  try {
    const providerRefund = await createStripeFullRefund({
      amountSatang: payment.amountSatang,
      instructionsEmail: parsed.value.instructionsEmail,
      orderId: payment.orderId,
      orderNumber: payment.orderNumber,
      paymentIntentId: payment.paymentIntentId,
      refundRequestId: parsed.value.refundRequestId,
      secretKey: environment.secretKey,
    });
    await recordFullRefund({
      adminUserId: account.id,
      paymentId: payment.paymentId,
      providerRefundId: providerRefund.providerRefundId,
      providerStatus: providerRefund.status,
      reason: parsed.value.reason,
    });
  } catch {
    logServerError("admin.refund_provider_failed", {
      paymentId: payment.paymentId,
    });
    redirect("/admin/refunds?notice=provider_failed");
  }

  revalidatePath("/account/library");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/refunds");
  redirect("/admin/refunds?notice=created");
}
