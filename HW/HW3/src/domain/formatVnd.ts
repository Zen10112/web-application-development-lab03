const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
});

export function formatVnd(priceVnd: number): string {
  return vndFormatter.format(priceVnd);
}
