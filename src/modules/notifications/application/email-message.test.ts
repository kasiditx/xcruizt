import { describe, expect, it } from "vitest";

import { createTransactionalEmailMessage } from "./email-message";

describe("createTransactionalEmailMessage", () => {
  it("creates a payment confirmation without embedding a signed URL", () => {
    const message = createTransactionalEmailMessage({
      kind: "order_paid",
      orderNumber: "XRZT-001",
      productName: null,
      siteUrl: "https://xcruizt.example",
      totalSatang: 129_900,
      username: "xtiskas",
      version: null,
    });

    expect(message.subject).toContain("XRZT-001");
    expect(message.text).toContain("฿1,299.00");
    expect(message.text).toContain(
      "https://xcruizt.example/account/library",
    );
    expect(message.text).not.toContain("X-Amz-Signature");
  });

  it("creates a product-version update message", () => {
    const message = createTransactionalEmailMessage({
      kind: "product_version_available",
      orderNumber: null,
      productName: "PRISMUTE",
      siteUrl: "https://xcruizt.example",
      totalSatang: null,
      username: "customer",
      version: "2.0.0",
    });

    expect(message.subject).toContain("PRISMUTE เวอร์ชัน 2.0.0");
  });
});
