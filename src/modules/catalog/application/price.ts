export function formatThaiBaht(priceSatang: number): string {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(priceSatang / 100);
}
