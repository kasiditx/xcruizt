import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function AdminBreadcrumbs({
  items,
}: {
  items: readonly { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="admin-breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}:${index}`}>
              {index > 0 ? (
                <ChevronRight aria-hidden="true" size={13} />
              ) : null}
              {item.href && !current ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={current ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
