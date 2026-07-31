import "server-only";

import Stripe from "stripe";

import type { PriceQuote } from "../application/pricing";
import type { PendingOrder } from "./order-repository";

export async function createStripeCheckoutSession(
  secretKey: string,
  siteUrl: string,
  order: PendingOrder,
  quote: PriceQuote,
) {
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create(
    {
      cancel_url: `${siteUrl}/checkout/cancelled?order=${order.orderNumber}`,
      client_reference_id: order.id,
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      line_items: quote.lines.map((line) => ({
        price_data: {
          currency: "thb",
          product_data: {
            name:
              line.quantity === 1
                ? line.productNameSnapshot
                : `${line.productNameSnapshot} × ${line.quantity}`,
          },
          unit_amount: line.lineTotalSatang,
        },
        quantity: 1,
      })),
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
      },
      mode: "payment",
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          order_number: order.orderNumber,
        },
      },
      payment_method_types: ["card", "promptpay"],
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    },
    { idempotencyKey: `checkout:${order.id}` },
  );

  if (!session.url) {
    throw new Error("Stripe Checkout Session returned no URL.");
  }

  return { id: session.id, url: session.url };
}

export async function retrieveStripeCheckoutSession(
  secretKey: string,
  sessionId: string,
) {
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session.url) {
    throw new Error("Stripe Checkout Session returned no URL.");
  }
  return { id: session.id, url: session.url };
}
