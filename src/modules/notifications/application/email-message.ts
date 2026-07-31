import type { CustomerEmailKind } from "./outbox-plan";

export type TransactionalEmailContext = {
  kind: CustomerEmailKind;
  orderNumber: string | null;
  productName: string | null;
  siteUrl: string;
  totalSatang: number | null;
  username: string;
  version: string | null;
};

export type TransactionalEmailMessage = {
  subject: string;
  text: string;
};

function baht(amountSatang: number): string {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    style: "currency",
  }).format(amountSatang / 100);
}

export function createTransactionalEmailMessage(
  context: TransactionalEmailContext,
): TransactionalEmailMessage {
  const greeting = `สวัสดี @${context.username}`;
  const libraryUrl = new URL("/account/library", context.siteUrl).toString();

  if (context.kind === "order_paid") {
    const order = context.orderNumber ?? "รายการสั่งซื้อของคุณ";
    const total =
      context.totalSatang === null
        ? ""
        : ` ยอดชำระ ${baht(context.totalSatang)}`;
    return {
      subject: `XCRUIZT ยืนยันการชำระเงิน ${order}`,
      text: `${greeting}\n\nเราได้รับการชำระเงินสำหรับ ${order} แล้ว${total}\nPreset ที่ได้รับสิทธิ์พร้อมใช้งานใน Library: ${libraryUrl}\n\nขอบคุณที่สนับสนุน XCRUIZT`,
    };
  }

  if (context.kind === "refund_processed") {
    const order = context.orderNumber ?? "รายการสั่งซื้อของคุณ";
    return {
      subject: `XCRUIZT ดำเนินการคืนเงิน ${order} แล้ว`,
      text: `${greeting}\n\nระบบดำเนินการคืนเงินสำหรับ ${order} แล้ว สิทธิ์ที่เกี่ยวข้องได้รับการปรับตามนโยบายคืนเงิน\nหากต้องการความช่วยเหลือ โปรดติดต่อ Support ของ XCRUIZT`,
    };
  }

  if (context.kind === "product_version_available") {
    const product = context.productName ?? "Preset ของคุณ";
    const version = context.version ? ` เวอร์ชัน ${context.version}` : "";
    return {
      subject: `XCRUIZT อัปเดต ${product}${version}`,
      text: `${greeting}\n\n${product}${version} พร้อมดาวน์โหลดแล้ว\nดู Changelog และไฟล์ล่าสุดได้ที่ Library: ${libraryUrl}`,
    };
  }

  if (context.kind === "entitlement_revoked") {
    const product = context.productName ?? "สินค้าในบัญชีของคุณ";
    return {
      subject: `XCRUIZT แจ้งการเปลี่ยนแปลงสิทธิ์ ${product}`,
      text: `${greeting}\n\nสิทธิ์ของ ${product} ถูกยกเลิกโดยผู้ดูแลระบบ\nหากคุณไม่คาดว่าจะเกิดการเปลี่ยนแปลงนี้ โปรดติดต่อ Support ของ XCRUIZT`,
    };
  }

  const product = context.productName ?? "Preset ของคุณ";
  return {
    subject: `XCRUIZT เปิดสิทธิ์ ${product} แล้ว`,
    text: `${greeting}\n\n${product} พร้อมใช้งานแล้ว\nเปิด Library เพื่อดูเวอร์ชันและดาวน์โหลดไฟล์: ${libraryUrl}`,
  };
}
