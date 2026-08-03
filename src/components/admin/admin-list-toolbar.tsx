import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

export function AdminListToolbar({
  action,
  query,
  resultCount,
  status,
  statusOptions,
}: {
  action: string;
  query?: string;
  resultCount: number;
  status?: string;
  statusOptions: readonly { label: string; value: string }[];
}) {
  const hasFilters = Boolean(query?.trim()) || Boolean(status && status !== "all");

  return (
    <div className="admin-list-toolbar">
      <form action={action} className="admin-list-toolbar__form" method="get">
        <label>
          <span>ค้นหา</span>
          <div className="admin-list-toolbar__control">
            <Search aria-hidden="true" size={16} />
            <input
              defaultValue={query}
              name="q"
              placeholder="ชื่อ, slug หรือรหัส"
              type="search"
            />
          </div>
        </label>
        <label>
          <span>สถานะ</span>
          <div className="admin-list-toolbar__control">
            <SlidersHorizontal aria-hidden="true" size={16} />
            <select defaultValue={status ?? "all"} name="status">
              <option value="all">ทั้งหมด</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </label>
        <button className="admin-inline-action" type="submit">
          แสดงผล
        </button>
        {hasFilters ? (
          <Link className="admin-list-toolbar__clear" href={action}>
            <X aria-hidden="true" size={15} />
            ล้างตัวกรอง
          </Link>
        ) : null}
      </form>
      <p aria-live="polite">พบ {resultCount.toLocaleString("th-TH")} รายการ</p>
    </div>
  );
}
