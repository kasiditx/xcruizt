import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { orderItems, orders } from "@/db/schema";

const CUSTOMER_ORDER_LIMIT = 50;

export async function listCustomerOrders(userId: string) {
  const orderRows = await db
    .select({
      createdAt: orders.createdAt,
      currency: orders.currency,
      discountSatang: orders.discountSatang,
      id: orders.id,
      orderNumber: orders.orderNumber,
      paidAt: orders.paidAt,
      status: orders.status,
      subtotalSatang: orders.subtotalSatang,
      totalSatang: orders.totalSatang,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(CUSTOMER_ORDER_LIMIT);

  if (orderRows.length === 0) return [];

  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productNameSnapshot,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderRows.map((order) => order.id)))
    .orderBy(orderItems.createdAt);

  const itemsByOrder = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const currentItems = itemsByOrder.get(item.orderId) ?? [];
    currentItems.push(item);
    itemsByOrder.set(item.orderId, currentItems);
  }

  return orderRows.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function findCustomerOrderByNumber(
  userId: string,
  orderNumber: string,
) {
  const [order] = await db
    .select({
      createdAt: orders.createdAt,
      currency: orders.currency,
      discountSatang: orders.discountSatang,
      id: orders.id,
      orderNumber: orders.orderNumber,
      paidAt: orders.paidAt,
      status: orders.status,
      subtotalSatang: orders.subtotalSatang,
      totalSatang: orders.totalSatang,
    })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.orderNumber, orderNumber),
      ),
    )
    .limit(1);

  if (!order) return null;

  const items = await db
    .select({
      discountSatang: orderItems.discountSatang,
      id: orderItems.id,
      lineSubtotalSatang: orderItems.lineSubtotalSatang,
      lineTotalSatang: orderItems.lineTotalSatang,
      productName: orderItems.productNameSnapshot,
      quantity: orderItems.quantity,
      skuCode: orderItems.skuCodeSnapshot,
      unitPriceSatang: orderItems.unitPriceSatang,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.createdAt);

  return { ...order, items };
}
