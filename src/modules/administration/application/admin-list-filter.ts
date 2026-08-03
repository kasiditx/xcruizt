export function filterAdminRows<T>(input: {
  getSearchText: (row: T) => string;
  getStatus: (row: T) => string;
  query?: string;
  rows: T[];
  status?: string;
}): T[] {
  const query = input.query?.trim().toLocaleLowerCase("th-TH") ?? "";
  const status = input.status?.trim() ?? "";

  return input.rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      input.getSearchText(row).toLocaleLowerCase("th-TH").includes(query);
    const matchesStatus =
      status.length === 0 ||
      status === "all" ||
      input.getStatus(row) === status;

    return matchesQuery && matchesStatus;
  });
}
