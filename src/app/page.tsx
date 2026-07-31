import {
  ArrowDownRight,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { AccountControls } from "@/components/account/account-controls";
import { listPublishedCollections } from "@/modules/catalog/infrastructure/storefront-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export default async function HomePage() {
  const [resolution, collections] = await Promise.all([
    getCurrentAccountResolution(),
    listPublishedCollections(),
  ]);

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="XCRUIZT หน้าแรก">
          XCRUIZT
          <span aria-hidden="true">®</span>
        </a>

        <nav className="desktop-nav" aria-label="เมนูหลัก">
          <a href="#collections">Collections</a>
          <a href="#process">How it works</a>
          <a href="#support">Support</a>
        </nav>

        <AccountControls resolution={resolution} />
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span>FIVEM / RESHADE</span>
            <span>CRAFTED IN THAILAND</span>
          </p>

          <h1>
            สีที่คุณตั้งใจ
            <span>ไม่ใช่แค่ฟิลเตอร์</span>
          </h1>

          <p className="hero-description">
            ReShade presets ที่ออกแบบเพื่อคุม mood, light และ clarity
            ให้ทุกเมืองมีภาพจำของตัวเอง
          </p>

          <div className="hero-actions">
            <a className="primary-action" href="#collections">
              สำรวจคอลเลกชัน
              <ArrowDownRight aria-hidden="true" size={19} />
            </a>
            <a className="text-action" href="#process">
              ดูวิธีเลือก preset
              <ArrowRight aria-hidden="true" size={17} />
            </a>
          </div>

          <div className="payment-note">
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.6} />
            <span>ชำระผ่าน Stripe PromptPay · รับสิทธิ์ใน Library</span>
          </div>
        </div>

        <div
          className="grade-stage"
          role="img"
          aria-label="ภาพจำลอง Before และ After แสดงการปรับสีและแสงด้วย XCRUIZT ReShade"
        >
          <div className="grade-stage__scene" aria-hidden="true">
            <div className="grade-stage__before" />
            <div className="grade-stage__after" />
            <div className="grade-stage__skyline">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="grade-stage__road" />
            <div className="grade-stage__divider">
              <span />
            </div>
          </div>

          <div className="grade-stage__hud" aria-hidden="true">
            <span>RAW / 01</span>
            <span>XCRUIZT GRADE / 01</span>
          </div>

          <div className="grade-stage__meter" aria-hidden="true">
            <span>SHADOW</span>
            <i />
            <i />
            <i />
            <i />
            <i />
            <span>LIGHT</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="จุดเด่นของ XCRUIZT">
        <p>
          <strong>01</strong>
          PromptPay ผ่าน Stripe
        </p>
        <p>
          <strong>02</strong>
          ดาวน์โหลดจาก Library
        </p>
        <p>
          <strong>03</strong>
          รับเวอร์ชันอัปเดต
        </p>
      </section>

      <section className="collections-section" id="collections">
        <div className="section-heading">
          <div>
            <p className="section-kicker">COLOR SYSTEMS / COLLECTIONS</p>
            <h2>เลือกบรรยากาศ ไม่ใช่แค่โทนสี</h2>
          </div>
          <p>
            แต่ละ Collection ถูกสร้างจากเป้าหมายการมองเห็นที่ต่างกัน
            เพื่อให้คุณเลือกจากวิธีที่อยากเล่นจริง
          </p>
        </div>

        {collections.length > 0 ? <div className="collection-list">
          {collections.map((collection, index) => (
            <article
              className="collection-row"
              key={collection.name}
            >
              <span className="collection-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p>
                  {collection.tagline ??
                    collection.accentKey ??
                    "XCRUIZT COLLECTION"}
                </p>
                <h3>
                  <a href={`/collections/${collection.slug}`}>
                    {collection.name}
                  </a>
                </h3>
              </div>
              <p className="collection-description">
                {collection.description}
              </p>
              <ArrowRight
                className="collection-arrow"
                aria-hidden="true"
                size={22}
              />
            </article>
          ))}
        </div> : (
          <div className="store-empty">
            <h3>กำลังเตรียม Collection</h3>
            <p>
              หน้านี้จะแสดงเฉพาะ Collection ที่ Publish แล้วจาก Catalog
            </p>
          </div>
        )}
      </section>

      <section className="process-section" id="process">
        <div className="process-statement">
          <p className="section-kicker">FROM CHECKOUT TO YOUR GAME</p>
          <h2>จ่ายครั้งเดียว แล้ว preset อยู่กับบัญชีของคุณ</h2>
        </div>

        <ol className="process-list">
          <li>
            <span>01</span>
            <div>
              <h3>เลือก SKU</h3>
              <p>เลือก preset เดี่ยวหรือ Collection ที่ตรงกับภาพที่ต้องการ</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>ชำระด้วย PromptPay</h3>
              <p>Stripe ยืนยันการชำระอย่างปลอดภัยผ่าน QR PromptPay</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>ดาวน์โหลดจาก Library</h3>
              <p>สิทธิ์และเวอร์ชันล่าสุดจะอยู่ในบัญชีของคุณ</p>
            </div>
          </li>
        </ol>
      </section>

      <footer id="support">
        <a className="wordmark" href="#top">
          XCRUIZT
        </a>
        <p>ReShade presets for FiveM.</p>
        <p>Store foundation · 2026</p>
      </footer>
    </main>
  );
}
