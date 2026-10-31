export function formatRupees(amount: number) {
  const whole = Math.round(amount).toString();
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs ${grouped}`;
}
