/**
 * Formats a number according to the Indian Numbering System (INR)
 * Example: 12550000 -> ₹1,25,50,000
 */
export const formatINR = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return '₹' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount);
};
