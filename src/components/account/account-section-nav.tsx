import Link from "next/link";

const accountLinks = [
  ["Library", "/account/library"],
  ["Orders", "/account/orders"],
  ["Downloads", "/account/downloads"],
  ["Discord", "/account/discord"],
  ["Profile", "/account/profile"],
] as const;

export function AccountSectionNav() {
  return (
    <nav aria-label="Account sections" className="account-section-nav">
      {accountLinks.map(([label, href]) => (
        <Link href={href} key={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
