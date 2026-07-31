import { ImageResponse } from "next/og";

export const alt = "XCRUIZT — ReShade Presets for FiveM";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "linear-gradient(135deg,#08080b,#19172a 60%,#2d2752)", color: "#f7f5fb", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: 64, width: "100%" }}>
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 10 }}>XCRUIZT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}><strong style={{ fontSize: 82, letterSpacing: -5, lineHeight: 1 }}>สีที่คุณตั้งใจ</strong><span style={{ color: "#c3bdcf", fontSize: 42 }}>ไม่ใช่แค่ฟิลเตอร์</span></div>
      <div style={{ color: "#a89bce", display: "flex", fontSize: 24, letterSpacing: 4 }}>FIVEM / RESHADE · CRAFTED IN THAILAND</div>
    </div>,
    size,
  );
}
