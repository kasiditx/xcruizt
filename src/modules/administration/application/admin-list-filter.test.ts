import { describe, expect, it } from "vitest";

import { filterAdminRows } from "./admin-list-filter";

const rows = [
  { name: "Cruizctrl 01", status: "published" },
  { name: "SEVORA Monday", status: "draft" },
];

describe("filterAdminRows", () => {
  it("matches search text without case sensitivity", () => {
    expect(
      filterAdminRows({
        getSearchText: (row) => row.name,
        getStatus: (row) => row.status,
        query: "CRUIZ",
        rows,
      }),
    ).toEqual([rows[0]]);
  });

  it("combines query and status filters", () => {
    expect(
      filterAdminRows({
        getSearchText: (row) => row.name,
        getStatus: (row) => row.status,
        query: "sevora",
        rows,
        status: "draft",
      }),
    ).toEqual([rows[1]]);
  });
});
